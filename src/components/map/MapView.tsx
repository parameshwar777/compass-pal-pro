import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Navigation, Crosshair, Layers, Plus, Minus, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocation } from "@/hooks/useLocation";

interface LocationMarkerProps {
  latitude: number;
  longitude: number;
  isPredicted?: boolean;
}

function LocationMarker({ isPredicted = false }: LocationMarkerProps) {
  return (
    <div className="relative">
      {/* Pulse ring */}
      <div
        className={cn(
          "absolute inset-0 rounded-full",
          isPredicted ? "prediction-glow" : "location-pulse"
        )}
        style={{
          width: isPredicted ? 28 : 24,
          height: isPredicted ? 28 : 24,
          margin: "auto",
        }}
      />
      {/* Marker dot */}
      <div
        className={cn(
          "relative rounded-full border-2 border-white shadow-lg",
          isPredicted ? "bg-prediction w-7 h-7" : "bg-accent w-6 h-6"
        )}
      />
    </div>
  );
}

export function MapView() {
  const { currentLocation, isLoading, error, refreshLocation, startTracking, stopTracking, isTracking } = useLocation();

  return (
    <div className="relative w-full h-full bg-card overflow-hidden">
      {/* Map placeholder with gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-secondary to-background">
        {/* Grid pattern for map feel */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--border)) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Mock road lines */}
        <svg
          className="absolute inset-0 w-full h-full opacity-20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 200 Q 200 250, 400 200 T 800 200"
            stroke="hsl(var(--accent))"
            strokeWidth="3"
            fill="none"
          />
          <path
            d="M100 0 Q 150 400, 100 800"
            stroke="hsl(var(--accent))"
            strokeWidth="3"
            fill="none"
          />
          <path
            d="M300 0 Q 350 300, 400 600"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth="2"
            fill="none"
          />
        </svg>

        {/* Location markers */}
        {!isLoading && currentLocation && (
          <>
            {/* Current location */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              <LocationMarker
                latitude={currentLocation.latitude}
                longitude={currentLocation.longitude}
              />
            </motion.div>

            {/* Predicted location */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", delay: 0.5 }}
              className="absolute top-[35%] left-[60%] -translate-x-1/2 -translate-y-1/2"
            >
              <LocationMarker
                latitude={currentLocation.latitude + 0.02}
                longitude={currentLocation.longitude + 0.015}
                isPredicted
              />
            </motion.div>
          </>
        )}

        {/* Loading overlay */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm"
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
      </div>

      {/* Map controls */}
      <div className="absolute right-4 top-20 flex flex-col gap-2">
        <Button variant="glass" size="icon" className="rounded-xl">
          <Plus className="w-5 h-5" />
        </Button>
        <Button variant="glass" size="icon" className="rounded-xl">
          <Minus className="w-5 h-5" />
        </Button>
        <div className="h-px bg-border my-1" />
        <Button variant="glass" size="icon" className="rounded-xl">
          <Layers className="w-5 h-5" />
        </Button>
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
        className="absolute right-4 bottom-36"
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
        className="absolute bottom-36 left-4 right-4"
      >
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Current Location</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {error ? "Location unavailable" : "Tracking active"}
              </p>
              {currentLocation && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-muted-foreground">
                    {currentLocation.latitude.toFixed(4)}°N,{" "}
                    {Math.abs(currentLocation.longitude).toFixed(4)}°W
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
                Office - 85% confidence
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