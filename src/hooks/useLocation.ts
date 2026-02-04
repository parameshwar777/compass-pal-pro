import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

interface Location {
  latitude: number;
  longitude: number;
  timestamp: Date;
  accuracy?: number;
}

interface UseLocationReturn {
  currentLocation: Location | null;
  isLoading: boolean;
  error: string | null;
  refreshLocation: () => void;
  startTracking: () => void;
  stopTracking: () => void;
  isTracking: boolean;
}

type WatchId = number | string;

export function useLocation(): UseLocationReturn {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [watchId, setWatchId] = useState<WatchId | null>(null);
  const { user } = useAuth();

  const isNative = Capacitor.isNativePlatform();

  const saveLocationToDb = useCallback(async (latitude: number, longitude: number) => {
    if (!user) return;

    const now = new Date();
    try {
      const { error: insertError } = await supabase.from("location_logs").insert({
        user_id: user.id,
        latitude,
        longitude,
        day: now.getDay(),
        hour: now.getHours(),
      });
      
      if (insertError) {
        console.error("Error saving location:", insertError);
      } else {
        console.log("Location saved:", { latitude, longitude });
      }
    } catch (err) {
      console.error("Error saving location:", err);
    }
  }, [user]);

  const setLocationFromCoords = useCallback((latitude: number, longitude: number, accuracy?: number) => {
    const newLocation = {
      latitude,
      longitude,
      timestamp: new Date(),
      accuracy,
    };
    console.log("Got position:", newLocation);
    setCurrentLocation(newLocation);
    setIsLoading(false);
    setError(null);
  }, []);

  const handlePosition = useCallback((position: GeolocationPosition) => {
    setLocationFromCoords(position.coords.latitude, position.coords.longitude, position.coords.accuracy);
  }, [setLocationFromCoords]);

  const handleError = useCallback((err: GeolocationPositionError) => {
    console.error("Geolocation error:", err);
    setError(err.message);
    setIsLoading(false);
  }, []);

  const refreshLocation = useCallback(() => {
    setIsLoading(true);
    setError(null);

    // Capacitor/Android APK: prefer Capacitor Geolocation (handles permissions + WebView quirks)
    if (isNative) {
      void (async () => {
        try {
          const perms = await Geolocation.checkPermissions();
          if (perms.location !== "granted" && perms.coarseLocation !== "granted") {
            await Geolocation.requestPermissions({ permissions: ["location", "coarseLocation"] });
          }

          const pos = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 15000,
          });

          setLocationFromCoords(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
        } catch (err: any) {
          console.error("Capacitor geolocation error:", err);
          setError(err?.message || "Failed to get location. Please allow location permission.");
          setIsLoading(false);
        }
      })();
      return;
    }
    
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        handlePosition, 
        handleError, 
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    } else {
      setError("Geolocation is not supported by your browser");
      setIsLoading(false);
    }
  }, [handlePosition, handleError]);

  const startTracking = useCallback(() => {
    // Capacitor tracking
    if (isNative) {
      console.log("Starting location tracking (native)...");
      void (async () => {
        try {
          const perms = await Geolocation.checkPermissions();
          if (perms.location !== "granted" && perms.coarseLocation !== "granted") {
            await Geolocation.requestPermissions({ permissions: ["location", "coarseLocation"] });
          }

          const id = await Geolocation.watchPosition(
            { enableHighAccuracy: true },
            (position, err) => {
              if (err) {
                console.error("Native watchPosition error:", err);
                setError(err.message || "Location tracking failed");
                return;
              }
              if (!position) return;

              setLocationFromCoords(position.coords.latitude, position.coords.longitude, position.coords.accuracy);
              saveLocationToDb(position.coords.latitude, position.coords.longitude);
            }
          );

          setWatchId(id);
          setIsTracking(true);
        } catch (err: any) {
          console.error("Error starting native tracking:", err);
          setError(err?.message || "Failed to start tracking");
          setIsLoading(false);
        }
      })();
      return;
    }

    if (!("geolocation" in navigator)) {
      setError("Geolocation is not supported");
      return;
    }

    console.log("Starting location tracking...");

    const id = navigator.geolocation.watchPosition(
      (position) => {
        handlePosition(position);
        saveLocationToDb(position.coords.latitude, position.coords.longitude);
      },
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );

    setWatchId(id);
    setIsTracking(true);
  }, [handlePosition, handleError, saveLocationToDb, isNative, setLocationFromCoords]);

  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      if (isNative) {
        void Geolocation.clearWatch({ id: String(watchId) });
      } else {
        navigator.geolocation.clearWatch(watchId as number);
      }
      setWatchId(null);
    }
    setIsTracking(false);
    console.log("Stopped location tracking");
  }, [watchId, isNative]);

  // Get initial location on mount
  useEffect(() => {
    // IMPORTANT (APK): requesting location on mount can fail; require a tap instead.
    if (isNative) {
      setIsLoading(false);
      setError("Tap Enable Location to request permission");
      return;
    }
    refreshLocation();
  }, [isNative, refreshLocation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        if (isNative) {
          void Geolocation.clearWatch({ id: String(watchId) });
        } else {
          navigator.geolocation.clearWatch(watchId as number);
        }
      }
    };
  }, [watchId, isNative]);

  return {
    currentLocation,
    isLoading,
    error,
    refreshLocation,
    startTracking,
    stopTracking,
    isTracking,
  };
}
