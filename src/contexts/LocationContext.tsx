import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { reverseGeocode } from "@/lib/geocoding";

interface Location {
  latitude: number;
  longitude: number;
  timestamp: Date;
  accuracy?: number;
}

interface LocationContextType {
  currentLocation: Location | null;
  placeName: string | null;
  isLoading: boolean;
  error: string | null;
  refreshLocation: () => void;
  startTracking: () => void;
  stopTracking: () => void;
  isTracking: boolean;
}

const LocationContext = createContext<LocationContextType | null>(null);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [placeName, setPlaceName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef<number | string | null>(null);
  const { user } = useAuth();
  const isNative = Capacitor.isNativePlatform();
  const initializedRef = useRef(false);

  const saveLocationToDb = useCallback(async (latitude: number, longitude: number) => {
    if (!user) return;
    const now = new Date();
    try {
      await supabase.from("location_logs").insert({
        user_id: user.id, latitude, longitude, day: now.getDay(), hour: now.getHours(),
      });
    } catch (err) {
      console.error("Error saving location:", err);
    }
  }, [user]);

  const updateLocation = useCallback(async (latitude: number, longitude: number, accuracy?: number) => {
    setCurrentLocation({ latitude, longitude, timestamp: new Date(), accuracy });
    setIsLoading(false);
    setError(null);
    // Reverse geocode in background
    try {
      const name = await reverseGeocode(latitude, longitude);
      setPlaceName(name);
    } catch {
      // ignore
    }
  }, []);

  const refreshLocation = useCallback(() => {
    setIsLoading(true);
    setError(null);

    if (isNative) {
      void (async () => {
        try {
          const perms = await Geolocation.checkPermissions();
          if (perms.location !== "granted" && perms.coarseLocation !== "granted") {
            await Geolocation.requestPermissions({ permissions: ["location", "coarseLocation"] });
          }
          const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
          updateLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
        } catch (err: any) {
          setError(err?.message || "Failed to get location.");
          setIsLoading(false);
        }
      })();
      return;
    }

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => updateLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
        (err) => { setError(err.message); setIsLoading(false); },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
      );
    } else {
      setError("Geolocation is not supported");
      setIsLoading(false);
    }
  }, [isNative, updateLocation]);

  const startTracking = useCallback(() => {
    if (isNative) {
      void (async () => {
        try {
          const perms = await Geolocation.checkPermissions();
          if (perms.location !== "granted" && perms.coarseLocation !== "granted") {
            await Geolocation.requestPermissions({ permissions: ["location", "coarseLocation"] });
          }
          const id = await Geolocation.watchPosition({ enableHighAccuracy: true }, (position, err) => {
            if (err || !position) return;
            updateLocation(position.coords.latitude, position.coords.longitude, position.coords.accuracy);
            saveLocationToDb(position.coords.latitude, position.coords.longitude);
          });
          watchIdRef.current = id;
          setIsTracking(true);
        } catch (err: any) {
          setError(err?.message || "Failed to start tracking");
        }
      })();
      return;
    }

    if (!("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (position) => {
        updateLocation(position.coords.latitude, position.coords.longitude, position.coords.accuracy);
        saveLocationToDb(position.coords.latitude, position.coords.longitude);
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
    watchIdRef.current = id;
    setIsTracking(true);
  }, [isNative, updateLocation, saveLocationToDb]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      if (isNative) {
        void Geolocation.clearWatch({ id: String(watchIdRef.current) });
      } else {
        navigator.geolocation.clearWatch(watchIdRef.current as number);
      }
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, [isNative]);

  // Auto-request on mount — only once
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      refreshLocation();
    }
  }, [refreshLocation]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        if (isNative) {
          void Geolocation.clearWatch({ id: String(watchIdRef.current) });
        } else {
          navigator.geolocation.clearWatch(watchIdRef.current as number);
        }
      }
    };
  }, [isNative]);

  return (
    <LocationContext.Provider value={{
      currentLocation, placeName, isLoading, error,
      refreshLocation, startTracking, stopTracking, isTracking,
    }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocationContext() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocationContext must be used within LocationProvider");
  return ctx;
}
