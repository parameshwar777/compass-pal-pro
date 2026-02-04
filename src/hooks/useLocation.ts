import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

export function useLocation(): UseLocationReturn {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const { user } = useAuth();

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

  const handlePosition = useCallback((position: GeolocationPosition) => {
    const newLocation = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      timestamp: new Date(),
      accuracy: position.coords.accuracy,
    };
    console.log("Got position:", newLocation);
    setCurrentLocation(newLocation);
    setIsLoading(false);
    setError(null);
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
    console.error("Geolocation error:", err);
    setError(err.message);
    setIsLoading(false);
    
    // Fallback to a default location
    setCurrentLocation({
      latitude: 40.7128,
      longitude: -74.0060,
      timestamp: new Date(),
    });
  }, []);

  const refreshLocation = useCallback(() => {
    setIsLoading(true);
    setError(null);
    
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
        maximumAge: 10000,
      }
    );

    setWatchId(id);
    setIsTracking(true);
  }, [handlePosition, handleError, saveLocationToDb]);

  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
    console.log("Stopped location tracking");
  }, [watchId]);

  // Get initial location on mount
  useEffect(() => {
    refreshLocation();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

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
