import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";

// Fix for default marker icons in Leaflet with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface LeafletMapProps {
  latitude: number;
  longitude: number;
  predictedLat?: number;
  predictedLng?: number;
  isTracking?: boolean;
  className?: string;
}

export function LeafletMap({
  latitude,
  longitude,
  predictedLat,
  predictedLng,
  isTracking = false,
  className,
}: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const currentMarkerRef = useRef<L.Marker | null>(null);
  const predictedMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);

  // Custom icons using inline styles (not Tailwind)
  const currentLocationIcon = L.divIcon({
    className: "",
    html: `
      <div style="position: relative; width: 20px; height: 20px;">
        <div style="position: absolute; inset: -4px; background: rgba(139, 92, 246, 0.3); border-radius: 50%; animation: pulse 2s infinite;"></div>
        <div style="width: 20px; height: 20px; background: #8b5cf6; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
        }
      </style>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  const predictedLocationIcon = L.divIcon({
    className: "",
    html: `
      <div style="position: relative; width: 24px; height: 24px;">
        <div style="position: absolute; inset: -4px; background: rgba(6, 182, 212, 0.3); border-radius: 50%; animation: glow 3s infinite;"></div>
        <div style="width: 24px; height: 24px; background: #06b6d4; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
          <div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
        </div>
      </div>
      <style>
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 10px rgba(6, 182, 212, 0.5); }
          50% { box-shadow: 0 0 20px rgba(6, 182, 212, 0.8); }
        }
      </style>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    // Prevent re-initialization
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [latitude, longitude],
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
    });

    // Dark-styled tile layer
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);

    // Add zoom control to bottom-left
    L.control.zoom({ position: "bottomleft" }).addTo(map);

    // Add attribution control
    L.control.attribution({ position: "bottomright", prefix: false })
      .addAttribution('© <a href="https://www.openstreetmap.org/copyright">OSM</a>')
      .addTo(map);

    mapInstanceRef.current = map;

    // Force resize after mount
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update current location marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Update or create current location marker
    if (currentMarkerRef.current) {
      currentMarkerRef.current.setLatLng([latitude, longitude]);
    } else {
      currentMarkerRef.current = L.marker([latitude, longitude], {
        icon: currentLocationIcon,
        zIndexOffset: 1000,
      }).addTo(map);
      currentMarkerRef.current.bindPopup("<b>You are here</b>");
    }

    // Smooth pan to new location
    map.setView([latitude, longitude], map.getZoom(), { animate: true });
  }, [latitude, longitude]);

  // Update predicted location marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (predictedLat != null && predictedLng != null) {
      if (predictedMarkerRef.current) {
        predictedMarkerRef.current.setLatLng([predictedLat, predictedLng]);
      } else {
        predictedMarkerRef.current = L.marker([predictedLat, predictedLng], {
          icon: predictedLocationIcon,
          zIndexOffset: 900,
        }).addTo(map);
        predictedMarkerRef.current.bindPopup("<b>Predicted destination</b>");
      }
    } else if (predictedMarkerRef.current) {
      predictedMarkerRef.current.remove();
      predictedMarkerRef.current = null;
    }
  }, [predictedLat, predictedLng]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      mapInstanceRef.current?.invalidateSize();
    };
    window.addEventListener("resize", handleResize);
    
    // Also invalidate on visibility change
    const handleVisibility = () => {
      if (!document.hidden) {
        setTimeout(() => mapInstanceRef.current?.invalidateSize(), 100);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return (
    <div
      ref={mapContainerRef}
      className={cn("w-full h-full", className)}
      style={{ 
        minHeight: "300px",
        background: "hsl(260 35% 9%)",
      }}
    />
  );
}
