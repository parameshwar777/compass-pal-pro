import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  MapPin,
  Clock,
  Target,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface LocationLog {
  id: string;
  latitude: number;
  longitude: number;
  hour: number;
  day: number;
  created_at: string;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function Dashboard() {
  const [locationLogs, setLocationLogs] = useState<LocationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchLocationLogs();
    }
  }, [user]);

  const fetchLocationLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("location_logs")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setLocationLogs(data || []);
    } catch (error) {
      console.error("Error fetching location logs:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats from real data
  const todayLogs = locationLogs.filter(log => {
    const logDate = new Date(log.created_at);
    const today = new Date();
    return logDate.toDateString() === today.toDateString();
  });

  const weekLogs = locationLogs.filter(log => {
    const logDate = new Date(log.created_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return logDate >= weekAgo;
  });

  // Calculate unique locations (clustering nearby points)
  const getUniqueLocations = (logs: LocationLog[]) => {
    const threshold = 0.001; // ~100 meters
    const clusters: { lat: number; lng: number; count: number }[] = [];
    
    logs.forEach(log => {
      const existing = clusters.find(c => 
        Math.abs(c.lat - log.latitude) < threshold && 
        Math.abs(c.lng - log.longitude) < threshold
      );
      if (existing) {
        existing.count++;
      } else {
        clusters.push({ lat: log.latitude, lng: log.longitude, count: 1 });
      }
    });
    
    return clusters;
  };

  const uniqueLocations = getUniqueLocations(locationLogs);
  const frequentLocations = uniqueLocations
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  const stats = [
    {
      label: "Locations Today",
      value: todayLogs.length.toString(),
      icon: MapPin,
      color: "accent",
    },
    {
      label: "Unique Places",
      value: uniqueLocations.length.toString(),
      icon: Target,
      color: "success",
    },
    {
      label: "Week Activity",
      value: weekLogs.length.toString(),
      icon: Clock,
      color: "primary",
    },
    {
      label: "Total Logs",
      value: locationLogs.length.toString(),
      icon: TrendingUp,
      color: "prediction",
    },
  ];

  // Get recent activity from real logs
  const recentActivity = locationLogs.slice(0, 5).map(log => ({
    time: new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    location: `${log.latitude.toFixed(4)}°, ${log.longitude.toFixed(4)}°`,
    day: dayNames[log.day],
  }));

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="p-4 pt-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Your real movement data
          </p>
        </motion.div>
      </div>

      {/* Date selector */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="px-4 mb-4"
      >
        <Button variant="glass" className="gap-2" onClick={fetchLocationLogs}>
          <Calendar className="w-4 h-4" />
          Refresh Data
        </Button>
      </motion.div>

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats grid */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 gap-3 px-4 mb-6"
          >
            {stats.map((stat) => (
              <motion.div key={stat.label} variants={item}>
                <Card variant="stat" className="h-full">
                  <div className="flex items-start justify-between">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${stat.color}/20`}
                    >
                      <stat.icon className={`w-5 h-5 text-${stat.color}`} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-bold text-foreground">
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.label}
                    </p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Frequent locations */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="px-4 mb-6"
          >
            <Card variant="glass">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Frequent Locations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {frequentLocations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No location data yet. Start tracking to see your patterns.
                  </p>
                ) : (
                  frequentLocations.map((location, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                        <span className="text-sm font-medium text-accent">
                          {index + 1}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-foreground">
                            {location.lat.toFixed(4)}°, {location.lng.toFixed(4)}°
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {location.count} visits
                          </span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(location.count / frequentLocations[0].count) * 100}%` }}
                            transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }}
                            className="h-full bg-gradient-primary rounded-full"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="px-4"
          >
            <Card variant="glass">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Recent Activity</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No recent activity. Enable location tracking to log your movements.
                  </p>
                ) : (
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />

                    <div className="space-y-4">
                      {recentActivity.map((activity, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 + index * 0.1 }}
                          className="flex items-center gap-4 relative"
                        >
                          <div className="w-8 h-8 rounded-full flex items-center justify-center z-10 bg-accent/20">
                            <div className="w-2 h-2 rounded-full bg-accent" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">
                              {activity.location}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {activity.day} at {activity.time}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </div>
  );
}
