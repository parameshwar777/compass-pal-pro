import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { MapView } from "@/components/map/MapView";
import { motion } from "framer-motion";

const Index = () => {
  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      {/* Header - Compact */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="shrink-0 px-3 py-2 border-b border-border bg-card/80 backdrop-blur-sm z-30"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-foreground">SafeTrack</h1>
            <p className="text-[9px] text-muted-foreground">Location Intelligence</p>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-[10px] text-muted-foreground">GPS</span>
          </div>
        </div>
      </motion.header>

      {/* Map - Takes remaining space */}
      <main className="flex-1 min-h-0 relative overflow-hidden">
        <MapView />
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

export default Index;
