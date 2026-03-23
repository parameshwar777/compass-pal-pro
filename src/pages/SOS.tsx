import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Phone, Mail, Plus, Trash2, User, Send, MapPin, Shield, MessageSquare, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useLocationContext as useLocation } from "@/contexts/LocationContext";
import { cn } from "@/lib/utils";

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  relationship: string | null;
}

export default function SOS() {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", phone: "", email: "", relationship: "" });
  const [sendingAlert, setSendingAlert] = useState(false);
  const [alertSent, setAlertSent] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const { user } = useAuth();
  const { currentLocation } = useLocation();

  useEffect(() => {
    if (user) fetchContacts();
  }, [user]);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from("emergency_contacts")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      toast.error("Failed to load emergency contacts");
    } finally {
      setLoading(false);
    }
  };

  const addContact = async () => {
    if (!newContact.name || !newContact.phone) {
      toast.error("Name and phone are required");
      return;
    }
    try {
      const { error } = await supabase.from("emergency_contacts").insert({
        user_id: user?.id,
        name: newContact.name,
        phone: newContact.phone,
        email: newContact.email || null,
        relationship: newContact.relationship || null,
      });
      if (error) throw error;
      toast.success("Contact added successfully");
      setNewContact({ name: "", phone: "", email: "", relationship: "" });
      setShowAddForm(false);
      fetchContacts();
    } catch (error) {
      console.error("Error adding contact:", error);
      toast.error("Failed to add contact");
    }
  };

  const deleteContact = async (id: string) => {
    try {
      const { error } = await supabase.from("emergency_contacts").delete().eq("id", id);
      if (error) throw error;
      toast.success("Contact removed");
      fetchContacts();
    } catch (error) {
      console.error("Error deleting contact:", error);
      toast.error("Failed to remove contact");
    }
  };

  const getSOSMessage = () => {
    const locationText = currentLocation
      ? `https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`
      : "Location unavailable";
    const coordsText = currentLocation
      ? `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`
      : "unavailable";
    return `🚨 EMERGENCY SOS ALERT! I need help immediately!\n\n📍 My location: ${locationText}\n📐 Coordinates: ${coordsText}\n\nPlease try to reach me or contact emergency services.`;
  };

  const handleSOSPress = () => {
    if (contacts.length === 0) {
      toast.error("Please add at least one emergency contact first");
      return;
    }
    setShowOptions(true);
  };

  const sendViaSMS = () => {
    const phoneContacts = contacts.filter(c => c.phone);
    if (phoneContacts.length === 0) {
      toast.error("No contacts with phone numbers");
      return;
    }
    const phones = phoneContacts.map(c => c.phone).join(",");
    const body = encodeURIComponent(getSOSMessage());
    window.open(`sms:${phones}?body=${body}`, "_self");
    toast.success("Opening SMS app...");
    setShowOptions(false);
  };

  const sendViaWhatsApp = () => {
    const phoneContacts = contacts.filter(c => c.phone);
    if (phoneContacts.length === 0) {
      toast.error("No contacts with phone numbers");
      return;
    }
    // WhatsApp only supports one number at a time via wa.me
    // Clean phone number - remove spaces, dashes, keep + and digits
    const cleanPhone = phoneContacts[0].phone.replace(/[^+\d]/g, "");
    // Remove leading + for wa.me format, or keep digits only
    const waNumber = cleanPhone.startsWith("+") ? cleanPhone.substring(1) : cleanPhone;
    const text = encodeURIComponent(getSOSMessage());
    // Use https://wa.me which works on both mobile and desktop
    window.open(`https://wa.me/${waNumber}?text=${text}`, "_blank");
    
    if (phoneContacts.length > 1) {
      toast.info(`WhatsApp opened for ${phoneContacts[0].name}. Send to others manually.`);
    } else {
      toast.success("Opening WhatsApp...");
    }
    setShowOptions(false);
  };

  const sendViaEmail = async () => {
    const emailContacts = contacts.filter(c => c.email);
    if (emailContacts.length === 0) {
      toast.error("No contacts with email addresses");
      return;
    }
    setSendingAlert(true);
    setShowOptions(false);

    try {
      const locationText = currentLocation
        ? `https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`
        : "Location unavailable";

      const { error } = await supabase.functions.invoke("send-sos", {
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
      setAlertSent(true);
      toast.success(`Email alert sent to ${emailContacts.length} contact(s)!`);
      setTimeout(() => setAlertSent(false), 5000);
    } catch (error) {
      console.error("Email SOS error:", error);
      // Fallback: open native email client
      const emails = emailContacts.map(c => c.email).join(",");
      const subject = encodeURIComponent("🚨 EMERGENCY SOS ALERT");
      const body = encodeURIComponent(getSOSMessage());
      window.open(`mailto:${emails}?subject=${subject}&body=${body}`, "_self");
      toast.info("Opening email app as fallback...");
    } finally {
      setSendingAlert(false);
    }
  };

  const sendAll = async () => {
    setShowOptions(false);
    // Send SMS
    const phoneContacts = contacts.filter(c => c.phone);
    if (phoneContacts.length > 0) {
      const phones = phoneContacts.map(c => c.phone).join(",");
      const body = encodeURIComponent(getSOSMessage());
      window.open(`sms:${phones}?body=${body}`, "_self");
    }
    // Send email
    await sendViaEmail();
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="shrink-0 px-3 py-3 border-b border-border bg-card/80 backdrop-blur-sm"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sos/20 flex items-center justify-center">
            <Shield className="w-4 h-4 text-sos" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground">Emergency SOS</h1>
            <p className="text-[10px] text-muted-foreground">Quick access to emergency alerts</p>
          </div>
        </div>
      </motion.div>

      <div className="flex-1 overflow-y-auto pb-2">
        {/* SOS Button Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="px-3 py-3"
        >
          <Card className="bg-gradient-to-br from-sos/20 to-sos/5 border-sos/30">
            <CardContent className="p-4 text-center">
              <AnimatePresence mode="wait">
                {alertSent ? (
                  <motion.div key="sent" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="py-4">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/20 flex items-center justify-center">
                      <Send className="w-8 h-8 text-success" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">Alert Sent!</h3>
                    <p className="text-sm text-muted-foreground">Your emergency contacts have been notified</p>
                  </motion.div>
                ) : showOptions ? (
                  <motion.div key="options" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <p className="text-sm font-semibold text-foreground mb-3">Choose how to send SOS</p>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <Button variant="outline" className="flex flex-col gap-1 h-auto py-3 border-accent/30" onClick={sendViaSMS}>
                        <MessageSquare className="w-5 h-5 text-accent" />
                        <span className="text-[10px]">SMS</span>
                      </Button>
                      <Button variant="outline" className="flex flex-col gap-1 h-auto py-3 border-green-500/30" onClick={sendViaWhatsApp}>
                        <MessageCircle className="w-5 h-5 text-green-500" />
                        <span className="text-[10px]">WhatsApp</span>
                      </Button>
                      <Button variant="outline" className="flex flex-col gap-1 h-auto py-3 border-blue-500/30" onClick={sendViaEmail}>
                        <Mail className="w-5 h-5 text-blue-500" />
                        <span className="text-[10px]">Email</span>
                      </Button>
                      <Button variant="outline" className="flex flex-col gap-1 h-auto py-3 border-sos/30" onClick={sendAll}>
                        <Send className="w-5 h-5 text-sos" />
                        <span className="text-[10px]">Send All</span>
                      </Button>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setShowOptions(false)}>
                      Cancel
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div key="button">
                    <p className="text-muted-foreground text-xs mb-4">
                      Press the button to alert your emergency contacts
                    </p>
                    <Button
                      variant="sos"
                      size="lg"
                      className="w-24 h-24 rounded-full text-base font-bold"
                      onClick={handleSOSPress}
                      disabled={sendingAlert || contacts.length === 0}
                    >
                      {sendingAlert ? (
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                          <AlertTriangle className="w-8 h-8" />
                        </motion.div>
                      ) : (
                        <div className="flex flex-col items-center gap-0.5">
                          <AlertTriangle className="w-8 h-8" />
                          <span>SOS</span>
                        </div>
                      )}
                    </Button>
                    {currentLocation && (
                      <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span>{currentLocation.latitude.toFixed(4)}°, {currentLocation.longitude.toFixed(4)}°</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        {/* Emergency Contacts */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="px-3">
          <Card variant="glass">
            <CardHeader className="pb-2 px-3 pt-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Emergency Contacts</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowAddForm(!showAddForm)} className="text-accent h-7 text-xs">
                  <Plus className="w-3 h-3 mr-1" />Add
                </Button>
              </div>
              <CardDescription className="text-[10px]">People who will receive your SOS alerts</CardDescription>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <AnimatePresence>
                {showAddForm && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-4 p-4 bg-secondary rounded-xl space-y-3">
                    <Input placeholder="Name" value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} className="bg-background" />
                    <Input placeholder="Phone (with country code e.g. +91...)" value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} className="bg-background" />
                    <Input placeholder="Email (for alerts)" type="email" value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} className="bg-background" />
                    <Input placeholder="Relationship (optional)" value={newContact.relationship} onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })} className="bg-background" />
                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={() => setShowAddForm(false)} className="flex-1">Cancel</Button>
                      <Button variant="gradient" onClick={addContact} className="flex-1">Save Contact</Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                </div>
              ) : contacts.length === 0 ? (
                <div className="text-center py-4">
                  <User className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">No emergency contacts yet</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Add contacts to enable SOS alerts</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {contacts.map((contact, index) => (
                    <motion.div key={contact.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }} className="flex items-center gap-2 p-2 bg-secondary rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{contact.name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-0.5 truncate"><Phone className="w-2.5 h-2.5" />{contact.phone}</span>
                          {contact.email && <span className="flex items-center gap-0.5 truncate"><Mail className="w-2.5 h-2.5" />{contact.email.split('@')[0]}...</span>}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-sos h-7 w-7" onClick={() => deleteContact(contact.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <BottomNavigation />
    </div>
  );
}
