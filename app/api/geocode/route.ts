/**
 * GET /api/geocode
 *
 * Reverse-geocodes latitude and longitude coordinates into a human-readable
 * place description via OpenStreetMap Nominatim.
 *
 * Complies with Nominatim usage guidelines:
 * - Proper descriptive User-Agent
 * - In-memory cache by rounded coordinates (4 decimal places ~11m precision)
 * - Throttled to maximum 1 request per second
 * - Graceful fallback: returns { label: "" } on failure
 */

import { NextRequest, NextResponse } from "next/server";

interface CacheEntry {
  label: string;
  timestamp: number;
}

// In-memory cache (persists within the server process)
const geocodeCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Throttle queue to enforce max 1 request per second
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 1050; // slightly over 1s for safety

async function throttleNominatim(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    const delay = MIN_REQUEST_INTERVAL_MS - elapsed;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  lastRequestTime = Date.now();
}

/**
 * Extract a concise, clean location description from Nominatim address parts.
 */
function formatAddressLabel(data: any): string {
  if (!data || typeof data !== "object") return "";

  const address = data.address;
  if (address) {
    const parts: string[] = [];

    // Street / building
    if (address.road) {
      if (address.house_number) {
        parts.push(`${address.house_number} ${address.road}`);
      } else {
        parts.push(address.road);
      }
    } else if (address.pedestrian || address.neighbourhood) {
      parts.push(address.pedestrian || address.neighbourhood);
    }

    // Suburb / district / city
    const area =
      address.suburb ||
      address.city_district ||
      address.borough ||
      address.town ||
      address.city ||
      address.village ||
      address.county;

    if (area && !parts.includes(area)) {
      parts.push(area);
    }

    // State / City if not already included
    if (address.city && !parts.includes(address.city)) {
      parts.push(address.city);
    }

    if (parts.length > 0) {
      return parts.join(", ");
    }
  }

  // Fallback to display_name (truncated to first 3 segments)
  if (data.display_name && typeof data.display_name === "string") {
    const segments = data.display_name.split(", ").slice(0, 3);
    return segments.join(", ");
  }

  return "";
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const latStr = searchParams.get("lat");
    const lngStr = searchParams.get("lng");

    if (!latStr || !lngStr) {
      return NextResponse.json(
        { error: "Latitude and longitude required" },
        { status: 400 },
      );
    }

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: "Invalid coordinates range" },
        { status: 400 },
      );
    }

    // Cache key rounded to 4 decimals (~11m resolution)
    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    const cached = geocodeCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({
        label: cached.label,
        cached: true,
      });
    }

    // Throttle requests against Nominatim to <= 1 req/sec
    await throttleNominatim();

    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(nominatimUrl, {
      headers: {
        "User-Agent": "CivitasLens/1.0 (incident-reporting@civitaslens.local; civic safety app)",
        Accept: "application/json",
      },
      signal: controller.signal,
    }).catch(() => null);

    clearTimeout(timeout);

    if (!res || !res.ok) {
      // Return empty label gracefully on upstream error
      return NextResponse.json({ label: "" });
    }

    const data = await res.json().catch(() => null);
    const label = formatAddressLabel(data);

    // Save to cache
    geocodeCache.set(cacheKey, {
      label,
      timestamp: Date.now(),
    });

    return NextResponse.json({
      label,
      cached: false,
    });
  } catch (err) {
    console.warn("Geocoding service error:", err);
    // Graceful fallback: never block user input
    return NextResponse.json({ label: "" });
  }
}
