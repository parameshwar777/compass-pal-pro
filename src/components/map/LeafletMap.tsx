import { useEffect, useRef, forwardRef } from "react";
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

export const LeafletMap = forwardRef<HTMLDivElement, LeafletMapProps>(
  function LeafletMap(
    {
      latitude,
      longitude,
      predictedLat,
      predictedLng,
      isTracking = false,
      className,
    },
    ref
  ) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const currentMarkerRef = useRef<L.Marker | null>(null);
    const predictedMarkerRef = useRef<L.Marker | null>(null);

    // Custom icons
    const currentLocationIcon = L.divIcon({
      className: "custom-marker",
      html: `
        <div style="position: relative;">
          <div style="position: absolute; inset: 0; width: 24px; height: 24px; background: rgba(139, 92, 246, 0.4); border-radius: 50%; animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 24px; height: 24px; background: #8b5cf6; border-radius: 50%; border: 2px solid white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); display: flex; align-items: center; justify-content: center;">
            <div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
          </div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const predictedLocationIcon = L.divIcon({
      className: "custom-marker",
      html: `
        <div style="position: relative;">
          <div style="position: absolute; inset: 0; width: 28px; height: 28px; background: rgba(245, 158, 11, 0.3); border-radius: 50%; animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;"></div>
          <div style="position: relative; width: 28px; height: 28px; background: #f59e0b; border-radius: 50%; border: 2px solid white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); display: flex; align-items: center; justify-content: center;">
            <svg style="width: 16px; height: 16px; color: white;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

      // Add zoom control to top right
      L.control.zoom({ position: "topright" }).addTo(mapInstanceRef.current);

      // Force a resize after mounting
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 100);

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

    // Handle resize
    useEffect(() => {
      const handleResize = () => {
        mapInstanceRef.current?.invalidateSize();
      };
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, []);

    return (
      <div
        ref={mapRef}
        className={cn("w-full h-full min-h-[400px]", className)}
        style={{ background: "hsl(var(--background))" }}
      />
    );
  }
);
