import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Phone, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "@/hooks/useLocation";
import { toast } from "sonner";

export function SOSButton() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const { user } = useAuth();
  const { currentLocation } = useLocation();

  const handleActivate = async () => {
    if (!user) {
      toast.error("Please log in first");
      return;
    }

    setIsActive(true);

    try {
      // Fetch emergency contacts
      const { data: contacts, error: contactsError } = await supabase
        .from("emergency_contacts")
        .select("*")
        .eq("user_id", user.id);

      if (contactsError) throw contactsError;

      if (!contacts || contacts.length === 0) {
        toast.error("Please add emergency contacts in the SOS tab first");
        setIsActive(false);
        return;
      }

      const emailContacts = contacts.filter(c => c.email);
      if (emailContacts.length === 0) {
        toast.error("No contacts with email addresses. Add email to your contacts.");
        setIsActive(false);
        return;
      }

      const locationText = currentLocation
        ? `https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`
        : "Location unavailable";

      const { data, error } = await supabase.functions.invoke("send-sos", {
        body: {
          contacts: emailContacts.map(c => ({ name: c.name, email: c.email, phone: c.phone })),
          location: locationText,
          coordinates: currentLocation ? {
            lat: currentLocation.latitude,
            lng: currentLocation.longitude,
          } : null,
        },
      });

      if (error) throw error;

      toast.success(`SOS alert sent to ${emailContacts.length} contact(s)!`);
    } catch (error) {
      console.error("SOS error:", error);
      toast.error("Failed to send SOS alert");
    } finally {
      setTimeout(() => {
        setIsActive(false);
        setIsExpanded(false);
      }, 2000);
    }
  };

  return (
    <div className="fixed bottom-28 right-4 z-50">
      <AnimatePresence mode="wait">
        {isExpanded ? (
          <motion.div
            key="expanded"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="glass-card rounded-2xl p-4 w-64"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-sos" />
                <span className="font-semibold text-foreground">Emergency SOS</span>
              </div>
              <button onClick={() => setIsExpanded(false)} className="p-1 rounded-lg hover:bg-accent/10 transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              This will alert your emergency contacts with your live location.
            </p>

            <AnimatePresence mode="wait">
              {isActive ? (
                <motion.div key="sending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-2 py-3">
                  <motion.div className="w-2 h-2 rounded-full bg-sos" animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} />
                  <span className="text-sm text-sos font-medium">Sending alert...</span>
                </motion.div>
              ) : (
                <motion.div key="buttons" className="flex gap-2">
                  <Button variant="sos" className="flex-1" onClick={handleActivate}>
                    <Phone className="w-4 h-4" />
                    Send Alert
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.button
            key="collapsed"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsExpanded(true)}
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center",
              "bg-gradient-sos shadow-glow-sos",
              "transition-all duration-300"
            )}
          >
            <AlertTriangle className="w-6 h-6 text-white" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
