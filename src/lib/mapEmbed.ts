// Keyless map embed for the physical store.
//
// Google's classic `maps.google.com/maps?...&output=embed` iframe is now blocked
// by X-Frame-Options (net::ERR_ABORTED), so the map rendered blank. OpenStreetMap
// is embeddable without an API key, so we use it for the visual map and keep a
// Google Maps link for turn-by-turn directions.

export const STORE_COORDS = { lat: 13.0847951, lon: 80.2443419 };

/** OpenStreetMap embeddable map centred on the given coords, with a marker. */
export function osmEmbedUrl(
  coords: { lat: number; lon: number } = STORE_COORDS,
  delta = 0.008,
): string {
  const { lat, lon } = coords;
  const bbox = [lon - delta, lat - delta, lon + delta, lat + delta]
    .map((n) => n.toFixed(6))
    .join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(6)},${lon.toFixed(6)}`;
}
