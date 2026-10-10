"use client";

/**
 * Read-Only Leaflet Map Thumbnail
 *
 * Displays a lightweight static/read-only map view centered at the observation
 * coordinates with OpenStreetMap tiles and a crisp custom SVG pin.
 *
 * SSR-safe: dynamically loads Leaflet on client mount.
 */

import React, { useEffect, useRef } from "react";

interface MapThumbnailProps {
  lat: number;
  lng: number;
  accuracyM?: number | null;
  className?: string;
  zoom?: number;
}

export function MapThumbnail({
  lat,
  lng,
  accuracyM,
  className = "h-36 w-full rounded border border-slate-200",
  zoom = 16,
}: MapThumbnailProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    let mapInstance: any = null;

    async function initMap() {
      if (!mapContainerRef.current) return;
      const L = (await import("leaflet")).default;
      if (!isMounted || !mapContainerRef.current) return;

      // Initialize map
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom,
        zoomControl: false,
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        attributionControl: false,
      });

      mapInstance = map;

      // OpenStreetMap tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      // Custom SVG Pin Icon
      const pinIcon = L.divIcon({
        className: "civitas-pin-icon",
        html: `
          <div style="transform: translate(-16px, -36px); filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
            <svg width="32" height="38" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0C5.37258 0 0 5.37258 0 12C0 20.5 12 32 12 32C12 32 24 20.5 24 12C24 5.37258 18.6274 0 12 0Z" fill="#0c2340" stroke="#FFFFFF" stroke-width="2"/>
              <circle cx="12" cy="12" r="4.5" fill="#f47216"/>
            </svg>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      L.marker([lat, lng], { icon: pinIcon }).addTo(map);

      // Optional GPS accuracy radius circle
      if (accuracyM && accuracyM > 0) {
        L.circle([lat, lng], {
          radius: accuracyM,
          color: "#f47216",
          weight: 1.5,
          fillColor: "#f47216",
          fillOpacity: 0.15,
        }).addTo(map);
      }

      setTimeout(() => {
        if (isMounted && mapInstance) {
          mapInstance.invalidateSize();
        }
      }, 100);
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstance) {
        mapInstance.remove();
        mapInstance = null;
      }
    };
  }, [lat, lng, accuracyM, zoom]);

  return <div ref={mapContainerRef} className={className} />;
}
