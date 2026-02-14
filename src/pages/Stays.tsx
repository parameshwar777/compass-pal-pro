import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Hotel,
  Utensils,
  Landmark,
  Star,
  MapPin,
  Heart,
  Search,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { SOSButton } from "@/components/sos/SOSButton";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useLocation } from "@/hooks/useLocation";
import { toast } from "sonner";

type PlaceType = "all" | "hotel" | "restaurant" | "attraction";

interface Place {
  name: string;
  type: string;
  category: string;
  latitude: number;
  longitude: number;
  rating: number;
  address: string | null;
}

const typeIcons = {
  hotel: Hotel,
  restaurant: Utensils,
  attraction: Landmark,
};

const typeColors = {
  hotel: "bg-primary/20 text-primary",
  restaurant: "bg-warning/20 text-warning",
  attraction: "bg-prediction/20 text-prediction",
};

export default function Stays() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeType, setActiveType] = useState<PlaceType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [fetched, setFetched] = useState(false);

  const { currentLocation, isLoading: locationLoading, error: locationError, refreshLocation } = useLocation();

  // Auto-fetch when location becomes available
  useEffect(() => {
    if (currentLocation && !fetched) {
      fetchNearbyPlaces();
    }
  }, [currentLocation]);

  const fetchNearbyPlaces = async () => {
    if (!currentLocation) {
      toast.error("Location not available. Enable GPS first.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("nearby-places", {
        body: {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        },
      });

      if (error) throw error;

      if (data?.places && Array.isArray(data.places)) {
        setPlaces(data.places);
        setFetched(true);
        toast.success(`Found ${data.places.length} places near you`);
      } else {
        toast.error("No places found");
      }
    } catch (error) {
      console.error("Error fetching nearby places:", error);
      toast.error("Failed to fetch nearby places");
    } finally {
      setLoading(false);
    }
  };

  const filteredPlaces = useMemo(() => {
    return places.filter((place) => {
      const matchesType = activeType === "all" || place.type === activeType;
      const matchesSearch =
        place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [places, activeType, searchQuery]);

  const tabs: { type: PlaceType; label: string; icon: any }[] = [
    { type: "all", label: "All", icon: MapPin },
    { type: "hotel", label: "Hotels", icon: Hotel },
    { type: "restaurant", label: "Food", icon: Utensils },
    { type: "attraction", label: "Attractions", icon: Landmark },
  ];

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="shrink-0 px-3 py-3 border-b border-border bg-card/80 backdrop-blur-sm"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
              <Hotel className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground">Stays</h1>
              <p className="text-[10px] text-muted-foreground">Nearby places</p>
            </div>
          </div>
          <Button
            variant="glass"
            size="sm"
            className="h-8"
            onClick={fetchNearbyPlaces}
            disabled={loading || !currentLocation}
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </motion.header>

      <main className="flex-1 overflow-y-auto pb-4 safe-bottom">
        {/* Location hint */}
        <div className="px-3 pt-3 mb-3">
          <div className="glass-card rounded-2xl p-3">
            <p className="text-xs text-muted-foreground">Your location</p>
            <p className="text-sm text-foreground truncate">
              {currentLocation
                ? `${currentLocation.latitude.toFixed(4)}°, ${currentLocation.longitude.toFixed(4)}°`
                : locationLoading
                  ? "Getting your location…"
                  : "Location not available"}
            </p>
            {locationError && (
              <p className="text-xs text-warning mt-1">Enable GPS to see nearby places.</p>
            )}
            {!currentLocation && !locationLoading && (
              <Button variant="glass" size="sm" onClick={refreshLocation} className="mt-2 h-8">
                Enable Location
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="px-3 mb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search places..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-card border-border text-sm"
            />
          </div>
        </div>

        {/* Type Tabs */}
        <div className="px-3 mb-3">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeType === tab.type;
              return (
                <Button
                  key={tab.type}
                  variant={isActive ? "default" : "glass"}
                  size="sm"
                  className={cn("flex-shrink-0 gap-1.5 h-8 text-xs", isActive && "bg-gradient-primary")}
                  onClick={() => setActiveType(tab.type)}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Places List */}
        <div className="px-3 space-y-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
              <p className="text-sm text-muted-foreground">Finding places near you...</p>
            </div>
          ) : !fetched && !currentLocation ? (
            <div className="text-center py-12">
              <MapPin className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Enable location to discover nearby places</p>
            </div>
          ) : filteredPlaces.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No places found</p>
            </div>
          ) : (
            filteredPlaces.map((place, index) => {
              const Icon = typeIcons[place.type as keyof typeof typeIcons] || MapPin;
              const colorClass = typeColors[place.type as keyof typeof typeColors] || "bg-accent/20 text-accent";

              return (
                <motion.div
                  key={`${place.name}-${index}`}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card variant="glass" className="overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", colorClass)}>
                          <Icon className="w-5 h-5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-foreground truncate">{place.name}</h3>
                          <p className="text-xs text-muted-foreground truncate">{place.category}</p>

                          <div className="flex items-center gap-3 mt-1.5">
                            <div className="flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 text-warning fill-warning" />
                              <span className="text-xs font-medium text-foreground">
                                {place.rating?.toFixed(1)}
                              </span>
                            </div>
                          </div>

                          {place.address && (
                            <p className="text-[10px] text-muted-foreground mt-1 truncate">
                              <MapPin className="w-2.5 h-2.5 inline mr-0.5" />
                              {place.address}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>

        <SOSButton />
      </main>

      <BottomNavigation />
    </div>
  );
}
