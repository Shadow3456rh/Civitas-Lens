"use client";

/**
 * Incident Detail Multi-Observation Map
 *
 * Shows the incident centroid alongside all linked observation pins on a clean map.
 * SSR-safe: loads Leaflet on client mount.
 */

import React, { useEffect, useRef } from "react";

interface ObservationPin {
  id: string;
  lat: number;
  lng: number;
  location_label?: string | null;
  summary?: string | null;
}

interface IncidentDetailMapProps {
  centroidLat: number;
  centroidLng: number;
  title: string;
  observations: ObservationPin[];
  className?: string;
}

export function IncidentDetailMap({
  centroidLat,
  centroidLng,
  title,
  observations,
  className = "h-56 w-full rounded border border-slate-300 relative overflow-hidden",
}: IncidentDetailMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      if (!mapContainerRef.current) return;
      const L = (await import("leaflet")).default;
      if (!isMounted || !mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: [centroidLat, centroidLng],
        zoom: 15,
        zoomControl: true,
        attributionControl: false,
      });

      mapInstanceRef.current = map;

      // CartoDB Voyager tiles
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        subdomains: "abcd",
      }).addTo(map);

      const bounds = L.latLngBounds([[centroidLat, centroidLng]]);

      // Centroid marker (Star or distinct Navy Icon)
      const centroidIcon = L.divIcon({
        className: "civitas-centroid-marker",
        html: `
          <div style="transform: translate(-16px, -36px); filter: drop-shadow(0 3px 6px rgba(0,0,0,0.4));">
            <svg width="34" height="40" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0C5.37258 0 0 5.37258 0 12C0 20.5 12 32 12 32C12 32 24 20.5 24 12C24 5.37258 18.6274 0 12 0Z" fill="#1D3557" stroke="#FFFFFF" stroke-width="2.5"/>
              <circle cx="12" cy="12" r="5" fill="#FBBF24"/>
            </svg>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      L.marker([centroidLat, centroidLng], { icon: centroidIcon })
        .addTo(map)
        .bindPopup(`<strong>Cluster Centroid</strong><br/>${title}`);

      // Add each observation pin
      observations.forEach((obs, idx) => {
        if (isNaN(obs.lat) || isNaN(obs.lng)) return;
        bounds.extend([obs.lat, obs.lng]);

        const obsIcon = L.divIcon({
          className: "civitas-obs-pin",
          html: `
            <div style="position: relative; transform: translate(-12px, -28px); filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
              <svg width="24" height="30" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 0C5.37258 0 0 5.37258 0 12C0 20.5 12 32 12 32C12 32 24 20.5 24 12C24 5.37258 18.6274 0 12 0Z" fill="#457B9D" stroke="#FFFFFF" stroke-width="1.5"/>
                <circle cx="12" cy="12" r="4" fill="#FFFFFF"/>
              </svg>
              <span style="position: absolute; top: -4px; right: -6px; background: #0F172A; color: white; font-size: 9px; font-weight: bold; border-radius: 9999px; width: 15px; height: 15px; display: flex; align-items: center; justify-content: center; border: 1px solid white;">
                #${idx + 1}
              </span>
            </div>
          `,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });

        L.marker([obs.lat, obs.lng], { icon: obsIcon })
          .addTo(map)
          .bindPopup(`<strong>Observation #${idx + 1}</strong><br/>${obs.location_label || "Field Observation"}`);
      });

      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
      }
    }

    init();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [centroidLat, centroidLng, title, observations]);

  return (
    <div className={className}>
      <div ref={mapContainerRef} className="h-full w-full z-0" />
    </div>
  );
}
