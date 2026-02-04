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
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const currentMarkerRef = useRef<L.Marker | null>(null);
  const predictedMarkerRef = useRef<L.Marker | null>(null);

  // Custom icons
  const currentLocationIcon = L.divIcon({
    className: "custom-marker",
    html: `
      <div class="relative">
        <div class="absolute inset-0 w-6 h-6 bg-violet-500/40 rounded-full animate-ping"></div>
        <div class="relative w-6 h-6 bg-violet-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
          <div class="w-2 h-2 bg-white rounded-full"></div>
        </div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  const predictedLocationIcon = L.divIcon({
    className: "custom-marker",
    html: `
      <div class="relative">
        <div class="absolute inset-0 w-7 h-7 bg-amber-500/30 rounded-full animate-pulse"></div>
        <div class="relative w-7 h-7 bg-amber-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
          <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          </svg>
        </div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    mapInstanceRef.current = L.map(mapRef.current, {
      center: [latitude, longitude],
      zoom: 15,
      zoomControl: false,
    });

    // Add OpenStreetMap tile layer with dark style
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(mapInstanceRef.current);

    // Add zoom control to bottom right
    L.control.zoom({ position: "topright" }).addTo(mapInstanceRef.current);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update current location marker
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (currentMarkerRef.current) {
      currentMarkerRef.current.setLatLng([latitude, longitude]);
    } else {
      currentMarkerRef.current = L.marker([latitude, longitude], {
        icon: currentLocationIcon,
      })
        .addTo(mapInstanceRef.current)
        .bindPopup("📍 Your current location");
    }

    mapInstanceRef.current.setView([latitude, longitude], mapInstanceRef.current.getZoom());
  }, [latitude, longitude]);

  // Update predicted location marker
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (predictedLat && predictedLng) {
      if (predictedMarkerRef.current) {
        predictedMarkerRef.current.setLatLng([predictedLat, predictedLng]);
      } else {
        predictedMarkerRef.current = L.marker([predictedLat, predictedLng], {
          icon: predictedLocationIcon,
        })
          .addTo(mapInstanceRef.current)
          .bindPopup("🎯 Predicted destination");
      }
    } else if (predictedMarkerRef.current) {
      predictedMarkerRef.current.remove();
      predictedMarkerRef.current = null;
    }
  }, [predictedLat, predictedLng]);

  return (
    <div
      ref={mapRef}
      className={cn("w-full h-full", className)}
      style={{ background: "hsl(var(--background))" }}
    />
  );
}
