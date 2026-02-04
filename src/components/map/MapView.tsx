import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Navigation, Crosshair, Layers, Plus, Minus, Play, Pause, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocation } from "@/hooks/useLocation";
import { LeafletMap } from "./LeafletMap";

export function MapView() {
  const { currentLocation, isLoading, error, refreshLocation, startTracking, stopTracking, isTracking } = useLocation();
  const [showPrediction, setShowPrediction] = useState(true);

  // Mock predicted location (offset from current)
  const predictedLat = currentLocation ? currentLocation.latitude + 0.008 : undefined;
  const predictedLng = currentLocation ? currentLocation.longitude + 0.005 : undefined;

  return (
    <div className="relative w-full h-full bg-background overflow-hidden">
      {/* Real Map */}
      {currentLocation && (
        <LeafletMap
          latitude={currentLocation.latitude}
          longitude={currentLocation.longitude}
          predictedLat={showPrediction ? predictedLat : undefined}
          predictedLng={showPrediction ? predictedLng : undefined}
          isTracking={isTracking}
          className="absolute inset-0"
        />
      )}

      {/* Loading overlay */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10"
        >
          <div className="flex flex-col items-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Navigation className="w-8 h-8 text-accent" />
            </motion.div>
            <span className="text-sm text-muted-foreground">
              Getting your location...
            </span>
          </div>
        </motion.div>
      )}

      {/* Map controls */}
      <div className="absolute right-4 top-20 flex flex-col gap-2 z-20">
        <Button variant="glass" size="icon" className="rounded-xl">
          <Layers className="w-5 h-5" />
        </Button>
        <Button 
          variant={showPrediction ? "default" : "glass"} 
          size="icon" 
          className={cn("rounded-xl", showPrediction && "bg-prediction")}
          onClick={() => setShowPrediction(!showPrediction)}
        >
          <Target className="w-5 h-5" />
        </Button>
        <div className="h-px bg-border my-1" />
        <Button 
          variant={isTracking ? "default" : "glass"} 
          size="icon" 
          className={cn("rounded-xl", isTracking && "bg-success")}
          onClick={isTracking ? stopTracking : startTracking}
        >
          {isTracking ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </Button>
      </div>

      {/* Recenter button */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="absolute right-4 bottom-36 z-20"
      >
        <Button
          variant="accent"
          size="icon-lg"
          className="rounded-xl shadow-glow"
          onClick={refreshLocation}
        >
          <Crosshair className="w-5 h-5" />
        </Button>
      </motion.div>

      {/* Location info card */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, type: "spring" }}
        className="absolute bottom-36 left-4 right-4 z-20"
      >
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Current Location</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {error ? "Location unavailable" : "GPS Active"}
              </p>
              {currentLocation && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-muted-foreground">
                    {currentLocation.latitude.toFixed(6)}°N,{" "}
                    {Math.abs(currentLocation.longitude).toFixed(6)}°
                    {currentLocation.longitude < 0 ? "W" : "E"}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-success/20">
              <div className={cn("w-2 h-2 rounded-full", isTracking ? "bg-success animate-pulse" : "bg-muted-foreground")} />
              <span className={cn("text-xs font-medium", isTracking ? "text-success" : "text-muted-foreground")}>
                {isTracking ? "Live" : "Paused"}
              </span>
            </div>
          </div>

          <div className="h-px bg-border my-3" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Next predicted</p>
              <p className="text-sm font-medium text-prediction">
                {showPrediction ? "Office - 85% confidence" : "Hidden"}
              </p>
            </div>
            <Button variant="ghost" size="sm" className="text-accent">
              View Route
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
