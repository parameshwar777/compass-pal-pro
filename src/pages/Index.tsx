import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { SOSButton } from "@/components/sos/SOSButton";
import { MapView } from "@/components/map/MapView";
import { motion } from "framer-motion";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const handleSOSActivate = () => {
    console.log("SOS Activated - sending alerts");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-0 left-0 right-0 z-30 p-4"
      >
        <div className="glass-card rounded-2xl px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">SafeTrack</h1>
            <p className="text-xs text-muted-foreground">AI Location Intelligence</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <Search className="w-5 h-5 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-xl relative">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accent" />
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Map takes full screen */}
      <div className="flex-1">
        <MapView />
      </div>

      {/* SOS Button */}
      <SOSButton onActivate={handleSOSActivate} />

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

export default Index;
