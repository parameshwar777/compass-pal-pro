import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Target, MapPin, Clock, TrendingUp, Calendar, ChevronRight, Brain, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { SOSButton } from "@/components/sos/SOSButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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

interface LocationLog {
  latitude: number;
  longitude: number;
  hour: number;
  day: number;
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
  patternMatches: number;
}

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function Predictions() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [locationLogs, setLocationLogs] = useState<LocationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [latestPrediction, setLatestPrediction] = useState<PredictionResult | null>(null);
  const { user, session } = useAuth();

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [predictionsRes, logsRes] = await Promise.all([
        supabase
          .from("predictions")
          .select("*")
          .eq("user_id", user?.id)
          .order("prediction_timestamp", { ascending: false })
          .limit(10),
        supabase
          .from("location_logs")
          .select("*")
          .eq("user_id", user?.id)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      if (predictionsRes.data) setPredictions(predictionsRes.data);
      if (logsRes.data) setLocationLogs(logsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
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
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/predict-location`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            hour: new Date().getHours(),
            day: new Date().getDay(),
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
      toast.success(`Prediction: ${data.prediction.label} (${Math.round(data.prediction.confidence * 100)}% confidence)`);
      
      // Refresh predictions list
      fetchData();
    } catch (error) {
      console.error("Prediction error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to predict location");
    } finally {
      setPredicting(false);
    }
  };

  // Analyze patterns from location logs
  const analyzePatterns = () => {
    const patterns: Record<number, Record<number, { lat: number; lng: number; count: number }[]>> = {};
    
    locationLogs.forEach((log) => {
      if (!patterns[log.day]) patterns[log.day] = {};
      if (!patterns[log.day][log.hour]) patterns[log.day][log.hour] = [];
      
      patterns[log.day][log.hour].push({
        lat: log.latitude,
        lng: log.longitude,
        count: 1,
      });
    });

    return patterns;
  };

  const patterns = analyzePatterns();
  const dayPatterns = patterns[selectedDay] || {};
  const hourlyData = Object.entries(dayPatterns).map(([hour, locations]) => ({
    hour: parseInt(hour),
    locations: locations.length,
    avgLat: locations.reduce((sum, l) => sum + l.lat, 0) / locations.length,
    avgLng: locations.reduce((sum, l) => sum + l.lng, 0) / locations.length,
  })).sort((a, b) => a.hour - b.hour);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-success";
    if (confidence >= 0.5) return "text-prediction";
    return "text-muted-foreground";
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 pt-6"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-prediction/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-prediction" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Predictions</h1>
            <p className="text-sm text-muted-foreground">AI-powered location forecasts</p>
          </div>
        </div>
      </motion.div>

      {/* Predict Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="px-4 mb-6"
      >
        <Button
          onClick={handlePredictLocation}
          disabled={predicting || !user}
          className="w-full h-14 bg-gradient-prediction text-prediction-foreground font-semibold text-lg rounded-2xl shadow-lg"
        >
          {predicting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Predicting...
            </>
          ) : (
            <>
              <Target className="w-5 h-5 mr-2" />
              Predict My Location
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Endpoint: POST /functions/v1/predict-location
        </p>
      </motion.div>

      {/* Latest Prediction Result */}
      {latestPrediction && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="px-4 mb-6"
        >
          <Card variant="glass" className="border-prediction/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4 text-prediction" />
                Latest Prediction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{latestPrediction.prediction.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {latestPrediction.prediction.latitude.toFixed(6)}°, {latestPrediction.prediction.longitude.toFixed(6)}°
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Based on {latestPrediction.prediction.basedOnDataPoints} data points
                  </p>
                </div>
                <div className={cn("text-2xl font-bold", getConfidenceColor(latestPrediction.prediction.confidence))}>
                  {Math.round(latestPrediction.prediction.confidence * 100)}%
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-3 px-4 mb-6"
      >
        <Card variant="stat" className="text-center">
          <p className="text-2xl font-bold text-accent">{locationLogs.length}</p>
          <p className="text-xs text-muted-foreground">Data Points</p>
        </Card>
        <Card variant="stat" className="text-center">
          <p className="text-2xl font-bold text-prediction">{predictions.length}</p>
          <p className="text-xs text-muted-foreground">Predictions</p>
        </Card>
        <Card variant="stat" className="text-center">
          <p className="text-2xl font-bold text-success">
            {predictions.length > 0 
              ? `${Math.round(predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length * 100)}%`
              : "N/A"
            }
          </p>
          <p className="text-xs text-muted-foreground">Avg Accuracy</p>
        </Card>
      </motion.div>

      {/* Day Selector */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15 }}
        className="px-4 mb-4"
      >
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {dayNames.map((day, index) => (
            <Button
              key={day}
              variant={selectedDay === index ? "default" : "glass"}
              size="sm"
              onClick={() => setSelectedDay(index)}
              className={cn(
                "flex-shrink-0",
                selectedDay === index && "bg-accent"
              )}
            >
              {day.slice(0, 3)}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Hourly Pattern */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="px-4 mb-6"
      >
        <Card variant="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent" />
              {dayNames[selectedDay]} Pattern
            </CardTitle>
            <CardDescription>
              Your typical movement on this day
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              </div>
            ) : hourlyData.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No data for {dayNames[selectedDay]}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Keep tracking to build patterns
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {hourlyData.map((data, index) => (
                  <motion.div
                    key={data.hour}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50"
                  >
                    <div className="w-12 text-xs text-muted-foreground">
                      {data.hour.toString().padStart(2, "0")}:00
                    </div>
                    <div className="flex-1">
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(data.locations * 10, 100)}%` }}
                          transition={{ delay: 0.3 + index * 0.03, duration: 0.5 }}
                          className="h-full bg-gradient-to-r from-accent to-prediction rounded-full"
                        />
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground w-16 text-right">
                      {data.locations} logs
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Predictions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="px-4"
      >
        <Card variant="glass">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4 text-prediction" />
                Recent Predictions
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-accent">
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              </div>
            ) : predictions.length === 0 ? (
              <div className="text-center py-8">
                <Target className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No predictions yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click "Predict My Location" to generate a prediction
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {predictions.slice(0, 5).map((prediction, index) => (
                  <motion.div
                    key={prediction.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-3 p-3 bg-secondary rounded-xl"
                  >
                    <div className="w-10 h-10 rounded-full bg-prediction/20 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-prediction" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {prediction.label || "Unknown Location"}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>
                          {prediction.predicted_lat.toFixed(4)}°, {prediction.predicted_lng.toFixed(4)}°
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(prediction.prediction_timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className={cn("text-sm font-semibold", getConfidenceColor(prediction.confidence))}>
                      {Math.round(prediction.confidence * 100)}%
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <SOSButton />
      <BottomNavigation />
    </div>
  );
}
