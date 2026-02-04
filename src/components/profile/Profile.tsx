import { motion } from "framer-motion";
import {
  User,
  MapPin,
  Bell,
  Shield,
  ChevronRight,
  LogOut,
  Moon,
  Smartphone,
  Users,
  HelpCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const menuItems = [
  {
    icon: Users,
    label: "Emergency Contacts",
    description: "Manage SOS contacts",
    link: true,
  },
  {
    icon: MapPin,
    label: "Location History",
    description: "View all tracked locations",
    link: true,
  },
  {
    icon: Bell,
    label: "Notifications",
    description: "Manage alerts and reminders",
    toggle: true,
    enabled: true,
  },
  {
    icon: Shield,
    label: "Privacy Settings",
    description: "Control data sharing",
    link: true,
  },
  {
    icon: Moon,
    label: "Dark Mode",
    description: "Switch appearance",
    toggle: true,
    enabled: true,
  },
  {
    icon: Smartphone,
    label: "Device Settings",
    description: "GPS and battery options",
    link: true,
  },
  {
    icon: HelpCircle,
    label: "Help & Support",
    description: "FAQs and contact",
    link: true,
  },
];

export function Profile() {
  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="p-4 pt-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className="text-2xl font-bold text-foreground">Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your account</p>
        </motion.div>
      </div>

      {/* Profile card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="px-4 mb-6"
      >
        <Card variant="gradient" className="overflow-hidden">
          <div className="relative p-5">
            {/* Background gradient accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-primary opacity-20 blur-3xl" />

            <div className="relative flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center">
                <User className="w-8 h-8 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-foreground">
                  John Doe
                </h2>
                <p className="text-sm text-muted-foreground">
                  john.doe@example.com
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="px-2 py-0.5 rounded-full bg-success/20 text-success text-xs font-medium">
                    Premium
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Since Jan 2024
                  </span>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="rounded-xl">
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="px-4 mb-6"
      >
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Days Active", value: "45" },
            { label: "Locations", value: "128" },
            { label: "Predictions", value: "312" },
          ].map((stat, index) => (
            <div
              key={stat.label}
              className="text-center p-3 rounded-2xl bg-card border border-border"
            >
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Menu items */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="px-4"
      >
        <Card variant="glass">
          <CardContent className="p-0 divide-y divide-border">
            {menuItems.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.05 }}
                className="flex items-center gap-4 p-4"
              >
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {item.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                {item.toggle ? (
                  <Switch defaultChecked={item.enabled} />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                )}
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Sign out */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="px-4 mt-6"
      >
        <Button variant="outline" className="w-full gap-2 h-12 text-destructive border-destructive/30 hover:bg-destructive/10">
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </motion.div>
    </div>
  );
}
