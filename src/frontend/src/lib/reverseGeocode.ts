const geoCache = new Map<string, string>();
let lastCall = 0;

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<string> {
  if (lat === 0 && lng === 0) return "";
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (geoCache.has(key)) return geoCache.get(key)!;

  // Throttle to 1 req/sec (Nominatim policy)
  const now = Date.now();
  const wait = Math.max(0, 1000 - (now - lastCall));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lng=${lng}&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "en",
          "User-Agent": "TrackerPro-AttendanceApp",
        },
      },
    );
    if (!res.ok) throw new Error("no response");
    const data = await res.json();
    const a = data.address || {};
    const placeName =
      a.amenity ||
      a.shop ||
      a.building ||
      a.office ||
      a.road ||
      a.neighbourhood ||
      a.suburb ||
      a.city_district ||
      data.display_name?.split(",")[0] ||
      "";
    const area =
      a.suburb ||
      a.neighbourhood ||
      a.city_district ||
      a.city ||
      a.town ||
      a.village ||
      "";
    const city = a.city || a.town || a.village || a.state_district || "";
    const parts = [placeName, area !== placeName ? area : "", city].filter(
      Boolean,
    );
    const label = [...new Set(parts)].join(", ");
    const result = label
      ? `${label} (${lat.toFixed(6)}, ${lng.toFixed(6)})`
      : `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    geoCache.set(key, result);
    return result;
  } catch {
    const fallback = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    geoCache.set(key, fallback);
    return fallback;
  }
}
