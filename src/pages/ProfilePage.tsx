import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { SOSButton } from "@/components/sos/SOSButton";
import { Profile as ProfileComponent } from "@/components/profile/Profile";

const ProfilePage = () => {
  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      <ProfileComponent />
      <SOSButton />
      <BottomNavigation />
    </div>
  );
};

export default ProfilePage;
