/**
 * Spatial coordinate parsing utility for PostGIS geography columns.
 *
 * Handles GeoJSON, WKT, and EWKB hex representations returned by Supabase PostgREST.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Extracts latitude and longitude from any PostGIS geography representation.
 */
export function extractCoordinates(location: unknown): LatLng {
  if (!location) {
    throw new Error("Missing location geography data");
  }

  // 1. GeoJSON format: { type: "Point", coordinates: [lng, lat] }
  if (typeof location === "object" && location !== null && "coordinates" in location) {
    const coords = (location as { coordinates: unknown[] }).coordinates;
    if (Array.isArray(coords) && coords.length >= 2) {
      const lng = Number(coords[0]);
      const lat = Number(coords[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
  }

  // 2. WKT format: "POINT(lng lat)" or "SRID=4326;POINT(lng lat)"
  if (typeof location === "string") {
    const wktMatch = location.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (wktMatch) {
      const lng = parseFloat(wktMatch[1]);
      const lat = parseFloat(wktMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }

    // 3. EWKB Hex string (standard PostGIS EWKB for 2D Point)
    // Format: Endian (1 byte) + Type (4 bytes) + [SRID (4 bytes)] + X (8 bytes) + Y (8 bytes)
    const cleanHex = location.trim();
    if (/^[0-9a-fA-F]{42,}$/.test(cleanHex)) {
      try {
        const buffer = Buffer.from(cleanHex, "hex");
        const isLE = buffer[0] === 1;
        const offset = buffer.length - 16;
        const lng = isLE ? buffer.readDoubleLE(offset) : buffer.readDoubleBE(offset);
        const lat = isLE ? buffer.readDoubleLE(offset + 8) : buffer.readDoubleBE(offset + 8);
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng };
        }
      } catch {
        // Fall through
      }
    }
  }

  throw new Error(`Unable to parse spatial coordinates from: ${JSON.stringify(location)}`);
}
