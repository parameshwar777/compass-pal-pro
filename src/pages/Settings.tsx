import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Shield, Moon, Sun, Smartphone, HelpCircle, ExternalLink, MapPin, Battery, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

export default function Settings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const section = searchParams.get("section") || "privacy";

  // Dark mode
  const [darkMode, setDarkMode] = useState(() => {
    return document.documentElement.classList.contains("dark") || !document.documentElement.classList.contains("light");
  });

  // Privacy
  const [shareLocation, setShareLocation] = useState(true);
  const [saveHistory, setSaveHistory] = useState(true);

  const handleDarkModeToggle = (checked: boolean) => {
    setDarkMode(checked);
    if (checked) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      localStorage.setItem("theme", "light");
    }
    toast.success(checked ? "Dark mode enabled" : "Light mode enabled");
  };

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light") {
      setDarkMode(false);
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    } else {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    }
  }, []);

  const title = section === "privacy" ? "Privacy Settings"
    : section === "darkmode" ? "Appearance"
    : section === "device" ? "Device Settings"
    : section === "help" ? "Help & Support"
    : "Settings";

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      <div className="shrink-0 px-3 py-3 border-b border-border bg-card/80 backdrop-blur-sm flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/profile")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-base font-bold text-foreground">{title}</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {section === "privacy" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-card border-border">
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 text-accent" /> Privacy & Data
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-foreground">Share location with contacts</p>
                    <p className="text-[10px] text-muted-foreground">Allow emergency contacts to see your location</p>
                  </div>
                  <Switch checked={shareLocation} onCheckedChange={(v) => { setShareLocation(v); toast.success(v ? "Location sharing enabled" : "Location sharing disabled"); }} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-foreground">Save location history</p>
                    <p className="text-[10px] text-muted-foreground">Store location logs for predictions</p>
                  </div>
                  <Switch checked={saveHistory} onCheckedChange={(v) => { setSaveHistory(v); toast.success(v ? "History saving enabled" : "History saving disabled"); }} />
                </div>
                <div className="p-3 bg-secondary rounded-lg">
                  <p className="text-[10px] text-muted-foreground">
                    🔒 Your data is encrypted and stored securely. Only you can access your location history. 
                    Emergency contacts only receive your location when you trigger an SOS alert.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {section === "darkmode" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-card border-border">
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  {darkMode ? <Moon className="w-4 h-4 text-accent" /> : <Sun className="w-4 h-4 text-yellow-500" />} Appearance
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-foreground">Dark Mode</p>
                    <p className="text-[10px] text-muted-foreground">Switch between light and dark themes</p>
                  </div>
                  <Switch checked={darkMode} onCheckedChange={handleDarkModeToggle} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${!darkMode ? "border-accent bg-white" : "border-border bg-secondary"}`} onClick={() => handleDarkModeToggle(false)}>
                    <Sun className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
                    <p className="text-[10px] text-center font-medium text-foreground">Light</p>
                  </div>
                  <div className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${darkMode ? "border-accent bg-gray-900" : "border-border bg-secondary"}`} onClick={() => handleDarkModeToggle(true)}>
                    <Moon className="w-6 h-6 mx-auto mb-2 text-accent" />
                    <p className="text-[10px] text-center font-medium text-foreground">Dark</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {section === "device" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-accent" /> Device Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-3">
                <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                  <MapPin className="w-5 h-5 text-accent shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-foreground">GPS / Location</p>
                    <p className="text-[10px] text-muted-foreground">Ensure "Location Services" is enabled in your phone's Settings → Privacy → Location Services</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                  <Battery className="w-5 h-5 text-green-500 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-foreground">Battery Optimization</p>
                    <p className="text-[10px] text-muted-foreground">Disable battery optimization for SafeTrack to allow background location tracking</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                  <Wifi className="w-5 h-5 text-blue-500 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-foreground">Network</p>
                    <p className="text-[10px] text-muted-foreground">Wi-Fi and mobile data improve location accuracy</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {section === "help" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-accent" /> Frequently Asked Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-3">
                {[
                  { q: "How does location prediction work?", a: "SafeTrack learns your daily routines (home, office, gym) and predicts where you'll go next based on time, day, and transition patterns." },
                  { q: "How does the SOS alert work?", a: "When you press SOS, your GPS coordinates and a Google Maps link are sent to your emergency contacts via SMS, WhatsApp, or email." },
                  { q: "Is my data safe?", a: "Yes. Your location data is stored securely in the cloud and only accessible by you. Emergency contacts only see your location when you trigger SOS." },
                  { q: "Why is my location inaccurate?", a: "Ensure GPS/Location is enabled, and you have a clear view of the sky. Indoor locations may be less accurate." },
                  { q: "How do I improve predictions?", a: "Log your locations with labels (home, office, gym) regularly. The more data points, the better the predictions." },
                ].map((faq, i) => (
                  <details key={i} className="group p-3 bg-secondary rounded-lg cursor-pointer">
                    <summary className="text-xs font-medium text-foreground list-none flex items-center justify-between">
                      {faq.q}
                      <span className="text-muted-foreground group-open:rotate-90 transition-transform">›</span>
                    </summary>
                    <p className="text-[10px] text-muted-foreground mt-2">{faq.a}</p>
                  </details>
                ))}
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground mb-2">Need more help?</p>
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => window.open("mailto:support@safetrack.app", "_blank")}>
                  <ExternalLink className="w-3 h-3 mr-1" /> Contact Support
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}
