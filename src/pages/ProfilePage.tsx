import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { SOSButton } from "@/components/sos/SOSButton";
import { Profile as ProfileComponent } from "@/components/profile/Profile";

const ProfilePage = () => {
  return (
    <div className="min-h-screen bg-background">
      <ProfileComponent />
      <SOSButton />
      <BottomNavigation />
    </div>
  );
};

export default ProfilePage;
