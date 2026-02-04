import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { SOSButton } from "@/components/sos/SOSButton";
import { AIChat } from "@/components/chat/AIChat";

const Assistant = () => {
  return (
    <div className="h-screen bg-background flex flex-col">
      <div className="flex-1 overflow-hidden pb-24">
        <AIChat />
      </div>
      <SOSButton />
      <BottomNavigation />
    </div>
  );
};

export default Assistant;
