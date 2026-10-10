"use client";

/**
 * Interactive Leaflet Location Picker Map
 *
 * Allows citizens to drop or drag a pin to adjust or manually set their
 * incident location when GPS is unavailable, inaccurate, or denied.
 *
 * SSR-safe: dynamically loads Leaflet on client mount.
 */

import React, { useEffect, useRef, useState } from "react";
import { Locate, MapPin, RefreshCw } from "lucide-react";

interface LocationPickerProps {
  lat: number;
  lng: number;
  onLocationChange: (lat: number, lng: number) => void;
  onRetryGps?: () => void;
  isLocating?: boolean;
  accuracyM?: number | null;
  className?: string;
}

export function LocationPicker({
  lat,
  lng,
  onLocationChange,
  onRetryGps,
  isLocating = false,
  accuracyM,
  className = "h-64 w-full rounded border border-slate-300 relative overflow-hidden",
}: LocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);

  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat,
    lng,
  });

  // Keep state synced with props if props change from outside
  useEffect(() => {
    setCurrentCoords({ lat, lng });
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    }
    if (circleRef.current && accuracyM) {
      circleRef.current.setLatLng([lat, lng]);
      circleRef.current.setRadius(accuracyM);
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng]);
    }
  }, [lat, lng, accuracyM]);

  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current) return;
      const L = (await import("leaflet")).default;
      if (!isMounted || !mapContainerRef.current) return;

      // Initialize interactive map
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 16,
        zoomControl: true,
        attributionControl: false,
      });

      mapInstanceRef.current = map;

      // OpenStreetMap tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      // Draggable custom pin icon
      const pinIcon = L.divIcon({
        className: "civitas-picker-pin",
        html: `
          <div style="transform: translate(-16px, -36px); filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35)); cursor: grab;">
            <svg width="34" height="42" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0C5.37258 0 0 5.37258 0 12C0 20.5 12 32 12 32C12 32 24 20.5 24 12C24 5.37258 18.6274 0 12 0Z" fill="#0C2340" stroke="#FFFFFF" stroke-width="2"/>
              <circle cx="12" cy="12" r="4.5" fill="#F47216"/>
            </svg>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = L.marker([lat, lng], {
        icon: pinIcon,
        draggable: true,
      }).addTo(map);

      markerRef.current = marker;

      // Marker drag end
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        setCurrentCoords({ lat: pos.lat, lng: pos.lng });
        onLocationChange(pos.lat, pos.lng);
      });

      // Map click drops or moves marker
      map.on("click", (e: any) => {
        marker.setLatLng(e.latlng);
        setCurrentCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
        onLocationChange(e.latlng.lat, e.latlng.lng);
      });

      // Optional accuracy radius circle if provided
      if (accuracyM && accuracyM > 0) {
        const circle = L.circle([lat, lng], {
          radius: accuracyM,
          color: "#f47216",
          weight: 1.5,
          fillColor: "#f47216",
          fillOpacity: 0.15,
        }).addTo(map);
        circleRef.current = circle;
      }

      setTimeout(() => {
        if (isMounted && mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 100);
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
      }
    };
  }, []);

  return (
    <div className="space-y-2">
      <div className={className}>
        <div ref={mapContainerRef} className="h-full w-full z-0" />

        {/* Floating guidance overlay */}
        <div className="absolute top-2 left-2 right-2 z-[400] flex items-center justify-between pointer-events-none">
          <span className="bg-white/95 backdrop-blur-sm text-[#0c2340] text-xs px-3 py-1.5 rounded-xl shadow-xs border border-slate-200 font-bold flex items-center gap-1.5 pointer-events-auto">
            <MapPin className="w-3.5 h-3.5 text-[#f47216]" />
            Tap map or drag pin to position
          </span>

          {onRetryGps && (
            <button
              type="button"
              onClick={onRetryGps}
              disabled={isLocating}
              aria-label="Try GPS again"
              className="bg-white/95 backdrop-blur-sm hover:bg-[#fff7ed] text-[#f47216] text-xs px-3 py-1.5 rounded-xl shadow-xs border border-[#f47216]/30 font-bold flex items-center gap-1.5 pointer-events-auto transition-colors disabled:opacity-50"
            >
              {isLocating ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#f47216]" />
              ) : (
                <Locate className="w-3.5 h-3.5 text-[#f47216]" />
              )}
              {isLocating ? "Locating…" : "Try GPS"}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-600 px-0.5">
        <span>
          Selected: {currentCoords.lat.toFixed(6)}, {currentCoords.lng.toFixed(6)}
        </span>
        <span className="text-slate-500">Manual pin</span>
      </div>
    </div>
  );
}
