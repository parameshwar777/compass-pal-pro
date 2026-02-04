import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { SOSButton } from "@/components/sos/SOSButton";
import { AIChat } from "@/components/chat/AIChat";

const Assistant = () => {
  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      <div className="flex-1 overflow-hidden">
        <AIChat />
      </div>
      <SOSButton />
      <BottomNavigation />
    </div>
  );
};

export default Assistant;
