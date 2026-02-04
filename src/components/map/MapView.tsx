import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Navigation, Crosshair, Layers, Play, Pause, Target, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocation } from "@/hooks/useLocation";
import { LeafletMap } from "./LeafletMap";

export function MapView() {
  const { currentLocation, isLoading, error, refreshLocation, startTracking, stopTracking, isTracking } = useLocation();
  const [showPrediction, setShowPrediction] = useState(true);

  const coordsText = useMemo(() => {
    if (!currentLocation) return "";
    const lat = currentLocation.latitude.toFixed(6);
    const lng = currentLocation.longitude.toFixed(6);
    return `${lat}, ${lng}`;
  }, [currentLocation]);

  const accuracyM = currentLocation?.accuracy != null ? Math.round(currentLocation.accuracy) : null;
  const accuracyQuality =
    accuracyM == null
      ? null
      : accuracyM <= 25
        ? "High"
        : accuracyM <= 100
          ? "Medium"
          : "Low";

  // Mock predicted location (offset from current)
  const predictedLat = currentLocation ? currentLocation.latitude + 0.008 : undefined;
  const predictedLng = currentLocation ? currentLocation.longitude + 0.005 : undefined;

  return (
    <div className="w-full h-full bg-background flex flex-col">
      {/* Map area */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        {currentLocation ? (
          <LeafletMap
            latitude={currentLocation.latitude}
            longitude={currentLocation.longitude}
            predictedLat={showPrediction ? predictedLat : undefined}
            predictedLng={showPrediction ? predictedLng : undefined}
            isTracking={isTracking}
            className="absolute inset-0 z-0"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Waiting for location…</p>
              <Button
                variant="accent"
                size="sm"
                className="mt-3"
                onClick={refreshLocation}
              >
                Try again
              </Button>
            </div>
          </div>
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
                Getting your location…
              </span>
            </div>
          </motion.div>
        )}

        {/* Map controls */}
        <div className="absolute right-4 top-20 flex flex-col gap-2 z-20">
          <Button variant="glass" size="icon" className="rounded-xl" aria-label="Layers">
            <Layers className="w-5 h-5" />
          </Button>
          <Button
            variant={showPrediction ? "default" : "glass"}
            size="icon"
            className={cn("rounded-xl", showPrediction && "bg-prediction")}
            onClick={() => setShowPrediction(!showPrediction)}
            aria-label="Toggle prediction"
          >
            <Target className="w-5 h-5" />
          </Button>
          <div className="h-px bg-border my-1" />
          <Button
            variant={isTracking ? "default" : "glass"}
            size="icon"
            className={cn("rounded-xl", isTracking && "bg-success")}
            onClick={isTracking ? stopTracking : startTracking}
            aria-label={isTracking ? "Pause tracking" : "Start tracking"}
          >
            {isTracking ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </Button>
        </div>

        {/* Recenter button */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="absolute right-4 bottom-4 z-20"
        >
          <Button
            variant="accent"
            size="icon-lg"
            className="rounded-xl shadow-glow"
            onClick={refreshLocation}
            aria-label="Recenter"
          >
            <Crosshair className="w-5 h-5" />
          </Button>
        </motion.div>
      </div>

      {/* Location details (below map) */}
      <div className="p-4 pb-6">
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground">Your location</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {error ? "Location unavailable (enable precise location)" : "Using device GPS"}
              </p>

              {currentLocation && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-muted-foreground break-all">
                    {coordsText}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {accuracyM != null && (
                      <span className="text-xs text-muted-foreground">
                        Accuracy: ~{accuracyM}m ({accuracyQuality})
                      </span>
                    )}
                    {accuracyM != null && accuracyM > 200 && (
                      <span className="text-xs text-warning">
                        Tip: turn on “Precise location” in browser/settings.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-success/20">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full",
                    isTracking ? "bg-success animate-pulse" : "bg-muted-foreground"
                  )}
                />
                <span
                  className={cn(
                    "text-xs font-medium",
                    isTracking ? "text-success" : "text-muted-foreground"
                  )}
                >
                  {isTracking ? "Live" : "Paused"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="glass"
                  size="sm"
                  onClick={() => {
                    if (!coordsText) return;
                    navigator.clipboard?.writeText(coordsText);
                  }}
                  disabled={!coordsText}
                >
                  Copy
                </Button>
                {currentLocation ? (
                  <Button variant="glass" size="sm" asChild>
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${currentLocation.latitude}&mlon=${currentLocation.longitude}#map=18/${currentLocation.latitude}/${currentLocation.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open map
                    </a>
                  </Button>
                ) : (
                  <Button variant="glass" size="sm" disabled>
                    Open map
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="h-px bg-border my-3" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Prediction</p>
              <p className="text-sm font-medium text-prediction">
                {showPrediction ? "On" : "Off"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-accent"
              onClick={() => setShowPrediction((v) => !v)}
            >
              {showPrediction ? "Hide" : "Show"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
