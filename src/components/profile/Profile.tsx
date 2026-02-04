import { useState, useEffect } from "react";
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
  Edit2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Profile {
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  phone: string | null;
}

export function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState({
    daysActive: 0,
    locations: 0,
    predictions: 0,
  });
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchStats();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("name, email, avatar_url, phone")
      .eq("user_id", user.id)
      .single();
    
    if (data) {
      setProfile(data);
      setEditName(data.name || "");
      setEditPhone(data.phone || "");
    }
  };

  const fetchStats = async () => {
    if (!user) return;
    
    // Count location logs
    const { count: locCount } = await supabase
      .from("location_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    // Count predictions
    const { count: predCount } = await supabase
      .from("predictions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    // Calculate days since signup
    const signupDate = new Date(user.created_at);
    const today = new Date();
    const daysActive = Math.floor((today.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    setStats({
      daysActive,
      locations: locCount || 0,
      predictions: predCount || 0,
    });
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: editName,
          phone: editPhone,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      setProfile((prev) => prev ? { ...prev, name: editName, phone: editPhone } : null);
      setIsEditing(false);
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleEmergencyContacts = () => {
    navigate("/sos");
    toast.info("Manage your emergency contacts in the SOS tab");
  };

  const handleLocationHistory = async () => {
    const { data, error } = await supabase
      .from("location_logs")
      .select("*")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      toast.error("Failed to fetch location history");
      return;
    }

    if (!data || data.length === 0) {
      toast.info("No location history yet. Start tracking to see your history.");
    } else {
      toast.success(`Found ${stats.locations} location logs. Latest: ${new Date(data[0].created_at).toLocaleString()}`);
    }
  };

  const handlePrivacySettings = () => {
    toast.info("Privacy settings: Your location data is stored securely and only visible to you.");
  };

  const handleDeviceSettings = () => {
    toast.info("For best GPS accuracy, ensure Location Services is enabled in your device settings.");
  };

  const handleHelpSupport = () => {
    toast.info("Need help? Contact us at support@safetrack.app");
  };

  const handleNotificationsToggle = (checked: boolean) => {
    setNotifications(checked);
    toast.success(checked ? "Notifications enabled" : "Notifications disabled");
  };

  const handleDarkModeToggle = (checked: boolean) => {
    setDarkMode(checked);
    // In a real app, you'd toggle the theme here
    toast.success(checked ? "Dark mode enabled" : "Light mode enabled");
  };

  const menuItems = [
    {
      icon: Users,
      label: "Emergency Contacts",
      description: "Manage SOS contacts",
      onClick: handleEmergencyContacts,
    },
    {
      icon: MapPin,
      label: "Location History",
      description: "View all tracked locations",
      onClick: handleLocationHistory,
    },
    {
      icon: Bell,
      label: "Notifications",
      description: "Manage alerts and reminders",
      toggle: true,
      enabled: notifications,
      onToggle: handleNotificationsToggle,
    },
    {
      icon: Shield,
      label: "Privacy Settings",
      description: "Control data sharing",
      onClick: handlePrivacySettings,
    },
    {
      icon: Moon,
      label: "Dark Mode",
      description: "Switch appearance",
      toggle: true,
      enabled: darkMode,
      onToggle: handleDarkModeToggle,
    },
    {
      icon: Smartphone,
      label: "Device Settings",
      description: "GPS and battery options",
      onClick: handleDeviceSettings,
    },
    {
      icon: HelpCircle,
      label: "Help & Support",
      description: "FAQs and contact",
      onClick: handleHelpSupport,
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto pb-4">
      {/* Header */}
      <div className="px-3 py-3">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className="text-base font-bold text-foreground">Profile</h1>
          <p className="text-[10px] text-muted-foreground">Manage your account</p>
        </motion.div>
      </div>

      {/* Profile card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="px-3 mb-4"
      >
        <Card variant="gradient" className="overflow-hidden">
          <div className="relative p-4">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-primary opacity-20 blur-3xl" />

            <div className="relative flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full rounded-xl object-cover" />
                ) : (
                  <User className="w-6 h-6 text-primary-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-foreground truncate">
                  {profile?.name || user?.email?.split("@")[0] || "User"}
                </h2>
                <p className="text-[10px] text-muted-foreground truncate">
                  {profile?.email || user?.email}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="px-1.5 py-0.5 rounded-full bg-success/20 text-success text-[9px] font-medium">
                    Active
                  </div>
                  <span className="text-[9px] text-muted-foreground">
                    Since {user?.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "N/A"}
                  </span>
                </div>
              </div>
              <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-lg h-8 w-8">
                    <Edit2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Your name"
                        className="bg-secondary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="+1234567890"
                        className="bg-secondary"
                      />
                    </div>
                    <Button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="w-full bg-gradient-primary"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="px-3 mb-4"
      >
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Days Active", value: stats.daysActive.toString() },
            { label: "Locations", value: stats.locations.toString() },
            { label: "Predictions", value: stats.predictions.toString() },
          ].map((stat) => (
            <div
              key={stat.label}
              className="text-center p-2 rounded-xl bg-card border border-border"
            >
              <p className="text-lg font-bold text-foreground">{stat.value}</p>
              <p className="text-[9px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Menu items */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="px-3"
      >
        <Card variant="glass">
          <CardContent className="p-0 divide-y divide-border">
            {menuItems.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.03 }}
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-secondary/50 transition-colors"
                onClick={item.toggle ? undefined : item.onClick}
              >
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <item.icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">
                    {item.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {item.description}
                  </p>
                </div>
                {item.toggle ? (
                  <Switch 
                    checked={item.enabled} 
                    onCheckedChange={item.onToggle}
                  />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
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
        className="px-3 mt-4"
      >
        <Button 
          variant="outline" 
          className="w-full gap-2 h-10 text-sm text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </motion.div>
    </div>
  );
}
