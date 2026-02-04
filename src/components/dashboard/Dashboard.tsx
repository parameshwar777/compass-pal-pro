import { motion } from "framer-motion";
import {
  MapPin,
  TrendingUp,
  Clock,
  Target,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const stats = [
  {
    label: "Locations Today",
    value: "12",
    change: "+3",
    icon: MapPin,
    color: "accent",
  },
  {
    label: "Prediction Accuracy",
    value: "87%",
    change: "+2%",
    icon: Target,
    color: "success",
  },
  {
    label: "Avg. Time at Location",
    value: "2.5h",
    change: "-15m",
    icon: Clock,
    color: "primary",
  },
  {
    label: "Weekly Distance",
    value: "45km",
    change: "+8km",
    icon: TrendingUp,
    color: "prediction",
  },
];

const frequentLocations = [
  { name: "Home", visits: 28, percentage: 40 },
  { name: "Office", visits: 22, percentage: 32 },
  { name: "Gym", visits: 12, percentage: 17 },
  { name: "Coffee Shop", visits: 8, percentage: 11 },
];

const recentActivity = [
  { time: "09:30 AM", location: "Coffee Shop", type: "arrival" },
  { time: "08:45 AM", location: "Office", type: "departure" },
  { time: "08:00 AM", location: "Office", type: "arrival" },
  { time: "07:30 AM", location: "Home", type: "departure" },
];

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

export function Dashboard() {
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
            Your movement insights at a glance
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
        <Button variant="glass" className="gap-2">
          <Calendar className="w-4 h-4" />
          This Week
          <ChevronRight className="w-4 h-4" />
        </Button>
      </motion.div>

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
                <span
                  className={`text-xs font-medium ${
                    stat.change.startsWith("+")
                      ? "text-success"
                      : "text-muted-foreground"
                  }`}
                >
                  {stat.change}
                </span>
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
            {frequentLocations.map((location, index) => (
              <div key={location.name} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                  <span className="text-sm font-medium text-accent">
                    {index + 1}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">
                      {location.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {location.visits} visits
                    </span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${location.percentage}%` }}
                      transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }}
                      className="h-full bg-gradient-primary rounded-full"
                    />
                  </div>
                </div>
              </div>
            ))}
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
              <Button variant="ghost" size="sm" className="text-accent">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
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
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                        activity.type === "arrival"
                          ? "bg-success/20"
                          : "bg-destructive/20"
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${
                          activity.type === "arrival"
                            ? "bg-success"
                            : "bg-destructive"
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {activity.location}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.type === "arrival" ? "Arrived" : "Left"} at{" "}
                        {activity.time}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
