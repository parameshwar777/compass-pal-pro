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
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { SOSButton } from "@/components/sos/SOSButton";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useLocation } from "@/hooks/useLocation";
import { haversineKm } from "@/lib/geo";

type PlaceType = "all" | "hotel" | "restaurant" | "attraction";

interface Place {
  id: string;
  name: string;
  type: string;
  category: string;
  latitude: number;
  longitude: number;
  rating: number;
  visit_count: number;
  address: string | null;
  image_url: string | null;
  is_saved: boolean;
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
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<PlaceType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const { currentLocation, isLoading: locationLoading, error: locationError, refreshLocation } = useLocation();

  const NEARBY_RADIUS_KM = 50;

  useEffect(() => {
    fetchPlaces();
  }, []);

  const fetchPlaces = async () => {
    try {
      const { data, error } = await supabase
        .from("places")
        .select("*")
        .order("rating", { ascending: false });

      if (error) throw error;
      setPlaces(data || []);
    } catch (error) {
      console.error("Error fetching places:", error);
    } finally {
      setLoading(false);
    }
  };

  const placesWithDistance = useMemo(() => {
    if (!currentLocation) return places.map((p) => ({ ...p, distance_km: null as number | null }));
    return places.map((p) => ({
      ...p,
      distance_km: haversineKm(
        { lat: currentLocation.latitude, lng: currentLocation.longitude },
        { lat: p.latitude, lng: p.longitude }
      ),
    }));
  }, [places, currentLocation]);

  const filteredPlaces = useMemo(() => {
    return placesWithDistance
      .filter((place) => {
        const matchesType = activeType === "all" || place.type === activeType;
        const matchesSearch =
          place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          place.category.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesNearby =
          showAll ||
          !currentLocation ||
          (place.distance_km != null && place.distance_km <= NEARBY_RADIUS_KM);

        return matchesType && matchesSearch && matchesNearby;
      })
      .sort((a, b) => {
        if (a.distance_km == null || b.distance_km == null) return 0;
        return a.distance_km - b.distance_km;
      });
  }, [placesWithDistance, activeType, searchQuery, showAll, currentLocation]);

  const tabs: { type: PlaceType; label: string; icon: any }[] = [
    { type: "all", label: "All", icon: MapPin },
    { type: "hotel", label: "Hotels", icon: Hotel },
    { type: "restaurant", label: "Food", icon: Utensils },
    { type: "attraction", label: "Attractions", icon: Landmark },
  ];

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="p-4 pt-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold text-foreground">Stays & Places</h1>
          <p className="text-muted-foreground mt-1">
            Discover hotels, restaurants & attractions near you
          </p>
        </motion.div>
      </div>

      {/* Location hint */}
      <div className="px-4 mb-3">
        <div className="glass-card rounded-2xl p-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Using location</p>
            <p className="text-sm text-foreground truncate">
              {currentLocation
                ? `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`
                : locationLoading
                  ? "Getting your location…"
                  : "Location not available"}
            </p>
            {locationError && (
              <p className="text-xs text-warning mt-1 truncate">
                Enable “Precise location” to see nearby results.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="glass" size="sm" onClick={refreshLocation}>
              Refresh
            </Button>
            <Button
              variant={showAll ? "default" : "glass"}
              size="sm"
              onClick={() => setShowAll((v) => !v)}
              className={cn(!showAll && "")}
            >
              {showAll ? "Showing all" : "Near me"}
            </Button>
          </div>
        </div>
      </div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="px-4 mb-4"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search places..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 bg-card border-border"
          />
        </div>
      </motion.div>

      {/* Type Tabs */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="px-4 mb-6"
      >
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeType === tab.type;
            return (
              <Button
                key={tab.type}
                variant={isActive ? "default" : "glass"}
                size="sm"
                className={cn(
                  "flex-shrink-0 gap-2",
                  isActive && "bg-gradient-primary"
                )}
                onClick={() => setActiveType(tab.type)}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </Button>
            );
          })}
        </div>
      </motion.div>

      {/* Places List */}
      <div className="px-4 space-y-3">
        {loading ? (
          // Loading skeleton
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-card animate-pulse" />
          ))
        ) : filteredPlaces.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {currentLocation && !showAll
                ? `No places found within ${NEARBY_RADIUS_KM}km of you`
                : "No places found"}
            </p>
          </div>
        ) : (
          filteredPlaces.map((place, index) => {
            const Icon = typeIcons[place.type as keyof typeof typeIcons] || MapPin;
            const colorClass = typeColors[place.type as keyof typeof typeColors] || "bg-accent/20 text-accent";
            
            return (
              <motion.div
                key={place.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <Card variant="glass" className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0", colorClass)}>
                        <Icon className="w-6 h-6" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-foreground truncate">
                              {place.name}
                            </h3>
                            <p className="text-sm text-muted-foreground truncate">
                              {place.category}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon" className="flex-shrink-0 rounded-lg">
                            <Heart className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-warning fill-warning" />
                            <span className="text-sm font-medium text-foreground">
                              {place.rating?.toFixed(1)}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {place.visit_count?.toLocaleString()} visits
                          </span>
                          {place.distance_km != null && (
                            <span className="text-xs text-muted-foreground">
                              {place.distance_km.toFixed(1)}km
                            </span>
                          )}
                        </div>
                        
                        {place.address && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            <MapPin className="w-3 h-3 inline mr-1" />
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
      <BottomNavigation />
    </div>
  );
}
