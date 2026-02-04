import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { SOSButton } from "@/components/sos/SOSButton";
import { Dashboard } from "@/components/dashboard/Dashboard";

const Analytics = () => {
  return (
    <div className="min-h-screen bg-background">
      <Dashboard />
      <SOSButton />
      <BottomNavigation />
    </div>
  );
};

export default Analytics;
