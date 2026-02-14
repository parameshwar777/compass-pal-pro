import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navigation, Crosshair, Play, Pause, Target, MapPin, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocation } from "@/hooks/useLocation";
import { LeafletMap } from "./LeafletMap";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function MapView() {
  const { currentLocation, isLoading, error, refreshLocation, startTracking, stopTracking, isTracking } = useLocation();
  const [showPrediction, setShowPrediction] = useState(true);
  const [currentLabel, setCurrentLabel] = useState<string | null>(null);
  const { user } = useAuth();

  const coordsText = useMemo(() => {
    if (!currentLocation) return "";
    return `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`;
  }, [currentLocation]);

  const accuracyM = currentLocation?.accuracy != null ? Math.round(currentLocation.accuracy) : null;
  const accuracyLabel = accuracyM == null ? null : accuracyM <= 30 ? "High" : accuracyM <= 100 ? "Medium" : "Low";

  // Fetch the latest label for the current location from location_logs
  useEffect(() => {
    if (!user || !currentLocation) return;
    const fetchLabel = async () => {
      const { data } = await supabase
        .from("location_logs")
        .select("label")
        .eq("user_id", user.id)
        .not("label", "is", null)
        .order("created_at", { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        setCurrentLabel(data[0].label);
      }
    };
    fetchLabel();
  }, [user, currentLocation]);

  const handleCopy = () => {
    if (coordsText) {
      navigator.clipboard?.writeText(coordsText);
      toast.success("Coordinates copied!");
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* Map Container */}
      <div className="relative flex-1 min-h-0">
        <AnimatePresence mode="wait">
          {currentLocation ? (
            <motion.div
              key="map"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0"
            >
              <LeafletMap
                latitude={currentLocation.latitude}
                longitude={currentLocation.longitude}
                isTracking={isTracking}
                className="w-full h-full"
              />
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-card"
            >
              <div className="text-center p-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-4">
                  {isLoading ? "Getting your location..." : error || "Location unavailable"}
                </p>
                {!isLoading && (
                  <Button onClick={refreshLocation} variant="default" size="sm">
                    Enable Location
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading Overlay */}
        <AnimatePresence>
          {isLoading && !currentLocation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-10"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Navigation className="w-8 h-8 text-accent" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Controls - always visible with higher z-index */}
        {currentLocation && (
          <div className="absolute right-3 top-3 flex flex-col gap-2 z-[1000]">
            <Button
              variant={showPrediction ? "default" : "outline"}
              size="icon"
              className={cn("h-10 w-10 rounded-full shadow-lg border-2 border-background", showPrediction && "bg-prediction text-prediction-foreground")}
              onClick={() => setShowPrediction(!showPrediction)}
            >
              <Target className="w-5 h-5" />
            </Button>
            <Button
              variant={isTracking ? "default" : "outline"}
              size="icon"
              className={cn("h-10 w-10 rounded-full shadow-lg border-2 border-background", isTracking && "bg-success text-success-foreground")}
              onClick={isTracking ? stopTracking : startTracking}
            >
              {isTracking ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
          </div>
        )}

        {/* Recenter Button */}
        {currentLocation && (
          <Button
            variant="default"
            size="icon"
            className="absolute right-3 bottom-3 h-12 w-12 rounded-full shadow-lg bg-accent text-accent-foreground z-[1000]"
            onClick={refreshLocation}
          >
            <Crosshair className="w-6 h-6" />
          </Button>
        )}
      </div>

      {/* Location Info Panel */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="shrink-0 p-3 pb-4 border-t border-border bg-card"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isTracking ? "bg-success animate-pulse" : "bg-muted-foreground"
              )} />
              <span className="text-xs font-medium text-muted-foreground">
                {isTracking ? "Live Tracking" : "Paused"}
              </span>
              {accuracyM != null && (
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded",
                  accuracyLabel === "High" ? "bg-success/20 text-success" :
                  accuracyLabel === "Medium" ? "bg-warning/20 text-warning" :
                  "bg-destructive/20 text-destructive"
                )}>
                  ±{accuracyM}m
                </span>
              )}
            </div>
            
            {currentLocation ? (
              <div>
                {currentLabel && (
                  <p className="text-sm font-semibold text-foreground capitalize mb-0.5">📍 {currentLabel}</p>
                )}
                <p className="text-xs font-mono text-muted-foreground truncate">
                  {coordsText}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Location unavailable</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={handleCopy}
              disabled={!coordsText}
            >
              <Copy className="w-4 h-4" />
            </Button>
            {currentLocation && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                asChild
              >
                <a
                  href={`https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
