import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Target, MapPin, Clock, TrendingUp, Calendar, ChevronRight, Brain, Loader2, Tag, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { SOSButton } from "@/components/sos/SOSButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "@/hooks/useLocation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Prediction {
  id: string;
  predicted_lat: number;
  predicted_lng: number;
  confidence: number;
  label: string | null;
  prediction_timestamp: string;
  created_at: string;
}

interface PredictionResult {
  prediction: {
    latitude: number;
    longitude: number;
    confidence: number;
    label: string;
    basedOnDataPoints: number;
  };
  totalDataPoints: number;
  labeledDataPoints: number;
  availableLabels: string[];
  transitions: { label: string; count: number }[];
}

const quickLabels = ["Home", "Office", "Gym", "Cricket", "College", "Mall", "Restaurant"];

export default function Predictions() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [latestPrediction, setLatestPrediction] = useState<PredictionResult | null>(null);
  const [currentLabel, setCurrentLabel] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [loggingLabel, setLoggingLabel] = useState(false);
  const [loggedLabels, setLoggedLabels] = useState<string[]>([]);
  const { user, session } = useAuth();
  const { currentLocation } = useLocation();

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [predictionsRes, labelsRes] = await Promise.all([
        supabase
          .from("predictions")
          .select("*")
          .eq("user_id", user?.id)
          .order("prediction_timestamp", { ascending: false })
          .limit(10),
        supabase
          .from("location_logs")
          .select("label")
          .eq("user_id", user?.id)
          .not("label", "is", null)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      if (predictionsRes.data) setPredictions(predictionsRes.data);
      if (labelsRes.data) {
        const unique = [...new Set(labelsRes.data.map((l) => l.label).filter(Boolean))] as string[];
        setLoggedLabels(unique);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const logCurrentLocation = async (label: string) => {
    if (!user || !currentLocation) {
      toast.error(currentLocation ? "Please log in" : "Location not available. Enable GPS first.");
      return;
    }

    setLoggingLabel(true);
    try {
      const now = new Date();
      const { error } = await supabase.from("location_logs").insert({
        user_id: user.id,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        day: now.getDay(),
        hour: now.getHours(),
        label: label.trim(),
      });

      if (error) throw error;
      toast.success(`Logged "${label}" at your current location`);
      setCurrentLabel(label);
      setCustomLabel("");
      fetchData();
    } catch (error) {
      console.error("Error logging location:", error);
      toast.error("Failed to log location");
    } finally {
      setLoggingLabel(false);
    }
  };

  const handlePredictLocation = async () => {
    if (!session?.access_token) {
      toast.error("Please log in to get predictions");
      return;
    }

    setPredicting(true);
    setLatestPrediction(null);

    try {
      const response = await fetch(
        `https://ttbwvysatpwjhwslqwfr.supabase.co/functions/v1/predict-location`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0Ynd2eXNhdHB3amh3c2xxd2ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxOTUwNDIsImV4cCI6MjA4NTc3MTA0Mn0.8X2R_28fRSCnRPaBsnlplHAs0DZ1bPyvOkYyjByCAxk",
          },
          body: JSON.stringify({
            hour: new Date().getHours(),
            day: new Date().getDay(),
            currentLabel: currentLabel || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.error === "Not enough location data") {
          toast.error(data.message || "Need more location data for predictions");
        } else {
          throw new Error(data.error || "Failed to predict location");
        }
        return;
      }

      setLatestPrediction(data);
      toast.success(`Next: ${data.prediction.label} (${Math.round(data.prediction.confidence * 100)}% confidence)`);
      fetchData();
    } catch (error) {
      console.error("Prediction error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to predict location");
    } finally {
      setPredicting(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-success";
    if (confidence >= 0.5) return "text-prediction";
    return "text-muted-foreground";
  };

  const allLabels = [...new Set([...quickLabels, ...loggedLabels])];

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="shrink-0 px-3 py-3 border-b border-border bg-card/80 backdrop-blur-sm"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-prediction/20 flex items-center justify-center">
            <Brain className="w-4 h-4 text-prediction" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground">Predictions</h1>
            <p className="text-[10px] text-muted-foreground">Log locations & predict next move</p>
          </div>
        </div>
      </motion.div>

      <div className="flex-1 overflow-y-auto pb-2">
        {/* Log Location Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="px-3 py-3"
        >
          <Card variant="glass">
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-accent" />
                Log Current Location
              </CardTitle>
              <CardDescription className="text-[10px]">
                Tag where you are now to train predictions
              </CardDescription>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {allLabels.map((label) => (
                  <Button
                    key={label}
                    variant={currentLabel === label ? "default" : "glass"}
                    size="sm"
                    className={cn("h-7 text-[10px] px-2", currentLabel === label && "bg-accent")}
                    onClick={() => logCurrentLocation(label)}
                    disabled={loggingLabel}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Custom label..."
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  className="h-8 text-xs bg-secondary"
                />
                <Button
                  variant="gradient"
                  size="sm"
                  className="h-8 px-3"
                  onClick={() => customLabel.trim() && logCurrentLocation(customLabel.trim())}
                  disabled={!customLabel.trim() || loggingLabel}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              {currentLocation && (
                <p className="text-[9px] text-muted-foreground mt-1.5 flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5" />
                  {currentLocation.latitude.toFixed(4)}°, {currentLocation.longitude.toFixed(4)}°
                </p>
              )}
              {!currentLocation && (
                <p className="text-[9px] text-warning mt-1.5">⚠ Enable GPS to log locations</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Predict Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="px-3 pb-3"
        >
          <Button
            onClick={handlePredictLocation}
            disabled={predicting || !user}
            className="w-full h-12 bg-gradient-prediction text-prediction-foreground font-semibold text-sm rounded-xl shadow-lg"
          >
            {predicting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Predicting...
              </>
            ) : (
              <>
                <Target className="w-4 h-4 mr-2" />
                {currentLabel ? `Predict Next (from ${currentLabel})` : "Predict My Next Location"}
              </>
            )}
          </Button>
        </motion.div>

        {/* Latest Prediction Result */}
        {latestPrediction && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-3 mb-3"
          >
            <Card variant="glass" className="border-prediction/30">
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="w-3.5 h-3.5 text-prediction" />
                  Prediction Result
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-lg font-bold text-foreground capitalize">{latestPrediction.prediction.label}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Based on {latestPrediction.prediction.basedOnDataPoints} data points
                    </p>
                  </div>
                  <div className={cn("text-2xl font-bold", getConfidenceColor(latestPrediction.prediction.confidence))}>
                    {Math.round(latestPrediction.prediction.confidence * 100)}%
                  </div>
                </div>

                {latestPrediction.transitions.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="text-[10px] text-muted-foreground mb-1">Other possibilities:</p>
                    <div className="flex flex-wrap gap-1">
                      {latestPrediction.transitions
                        .filter((t) => t.label !== latestPrediction.prediction.label)
                        .map((t) => (
                          <span key={t.label} className="text-[9px] bg-secondary px-2 py-0.5 rounded-full capitalize">
                            {t.label} ({t.count}x)
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-3 gap-2 px-3 mb-3"
        >
          <Card variant="stat" className="text-center py-2">
            <p className="text-lg font-bold text-accent">{loggedLabels.length}</p>
            <p className="text-[9px] text-muted-foreground">Labels</p>
          </Card>
          <Card variant="stat" className="text-center py-2">
            <p className="text-lg font-bold text-prediction">{predictions.length}</p>
            <p className="text-[9px] text-muted-foreground">Predictions</p>
          </Card>
          <Card variant="stat" className="text-center py-2">
            <p className="text-lg font-bold text-success">
              {predictions.length > 0
                ? `${Math.round((predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length) * 100)}%`
                : "N/A"}
            </p>
            <p className="text-[9px] text-muted-foreground">Avg Accuracy</p>
          </Card>
        </motion.div>

        {/* Recent Predictions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="px-3"
        >
          <Card variant="glass">
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-prediction" />
                Recent Predictions
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                </div>
              ) : predictions.length === 0 ? (
                <div className="text-center py-4">
                  <Target className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">No predictions yet</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Log locations first, then predict
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {predictions.slice(0, 5).map((prediction, index) => (
                    <motion.div
                      key={prediction.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-2 p-2 bg-secondary rounded-lg"
                    >
                      <div className="w-8 h-8 rounded-full bg-prediction/20 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4 text-prediction" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate capitalize">
                          {prediction.label || "Unknown"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(prediction.prediction_timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className={cn("text-xs font-semibold", getConfidenceColor(prediction.confidence))}>
                        {Math.round(prediction.confidence * 100)}%
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <SOSButton />
      <BottomNavigation />
    </div>
  );
}
