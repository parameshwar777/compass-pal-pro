import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { SOSButton } from "@/components/sos/SOSButton";
import { Dashboard } from "@/components/dashboard/Dashboard";

const Analytics = () => {
  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <Dashboard />
      </div>
      <SOSButton />
      <BottomNavigation />
    </div>
  );
};

export default Analytics;
