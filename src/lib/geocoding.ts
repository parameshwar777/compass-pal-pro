// Reverse geocoding using OpenStreetMap Nominatim (free, no API key)
const cache = new Map<string, string>();

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (cache.has(key)) return cache.get(key)!;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
      { headers: { "User-Agent": "SafeTrack/1.0" } }
    );
    if (!res.ok) throw new Error("Geocoding failed");
    const data = await res.json();
    
    const addr = data.address;
    // Build a readable name: neighbourhood/suburb, city
    const parts = [
      addr?.neighbourhood || addr?.suburb || addr?.hamlet || addr?.village || addr?.town,
      addr?.city || addr?.county || addr?.state_district,
    ].filter(Boolean);
    
    const name = parts.length > 0 ? parts.join(", ") : data.display_name?.split(",").slice(0, 2).join(",") || `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
    cache.set(key, name);
    return name;
  } catch {
    return `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
  }
}
