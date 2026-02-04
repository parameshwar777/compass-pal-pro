import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Target, MapPin, Clock, TrendingUp, Calendar, ChevronRight, Brain } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

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

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function Predictions() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [locationLogs, setLocationLogs] = useState<LocationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const { user } = useAuth();

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
                  Predictions will appear as you collect more location data
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

      <BottomNavigation />
    </div>
  );
}
