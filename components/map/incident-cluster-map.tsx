"use client";

/**
 * Incident Cluster & Severity Map
 *
 * Renders an interactive Leaflet map of all active incident clusters.
 * Markers are colored by severity (Critical: Red, High: Orange, Medium: Amber, Low: Emerald)
 * and display observation count badges.
 *
 * SSR-safe: loads Leaflet on client mount.
 */

import React, { useEffect, useRef } from "react";
import Link from "next/link";

export interface IncidentMapItem {
  id: string;
  title: string;
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  status: string;
  summary?: string | null;
  observation_count: number;
  lat: number;
  lng: number;
}

interface IncidentClusterMapProps {
  incidents: IncidentMapItem[];
  selectedIncidentId?: string | null;
  onSelectIncident?: (id: string) => void;
  className?: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#DC2626", // Red
  high: "#EA580C",     // Orange
  medium: "#D97706",   // Amber
  low: "#059669",      // Emerald
};

export function IncidentClusterMap({
  incidents,
  selectedIncidentId,
  onSelectIncident,
  className = "h-full w-full",
}: IncidentClusterMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);
  const markerMapRef = useRef<Map<string, any>>(new Map());

  // Initialize Map
  useEffect(() => {
    let isMounted = true;

    async function init() {
      if (!mapContainerRef.current) return;
      const L = (await import("leaflet")).default;
      if (!isMounted || !mapContainerRef.current) return;

      // Default center: center of mass of incidents or SF default
      let defaultCenter: [number, number] = [37.7749, -122.4194];
      if (incidents.length > 0) {
        defaultCenter = [incidents[0].lat, incidents[0].lng];
      }

      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: incidents.length > 0 ? 13 : 12,
        zoomControl: true,
        attributionControl: false,
      });

      mapInstanceRef.current = map;

      // OpenStreetMap standard tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      // Markers layer group
      const markersGroup = L.layerGroup().addTo(map);
      markersGroupRef.current = markersGroup;

      renderMarkers(L, map, markersGroup);

      // Ensure full-width tiles are loaded properly
      setTimeout(() => {
        if (isMounted && mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 150);

      const handleResize = () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      };
      window.addEventListener("resize", handleResize);
    }

    init();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersGroupRef.current = null;
      }
    };
  }, []);

  // Update Markers when incidents list changes
  useEffect(() => {
    async function updateMarkers() {
      if (!mapInstanceRef.current || !markersGroupRef.current) return;
      const L = (await import("leaflet")).default;
      renderMarkers(L, mapInstanceRef.current, markersGroupRef.current);
    }

    updateMarkers();
  }, [incidents]);

  // Center/highlight selected incident
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedIncidentId) return;
    const marker = markerMapRef.current.get(selectedIncidentId);
    if (marker) {
      const latLng = marker.getLatLng();
      mapInstanceRef.current.flyTo(latLng, 15, { duration: 0.8 });
      marker.openPopup();
    }
  }, [selectedIncidentId]);

  function renderMarkers(L: any, map: any, group: any) {
    group.clearLayers();
    markerMapRef.current.clear();

    if (incidents.length === 0) return;

    const bounds = L.latLngBounds([]);

    incidents.forEach((inc) => {
      if (isNaN(inc.lat) || isNaN(inc.lng)) return;

      bounds.extend([inc.lat, inc.lng]);

      const pinColor = SEVERITY_COLORS[inc.severity] || "#0a2540";
      const isSelected = inc.id === selectedIncidentId;

      // Custom Pin SVG with count badge
      const iconHtml = `
        <div style="position: relative; transform: translate(-16px, -36px); filter: drop-shadow(0 3px 5px rgba(0,0,0,0.3)); cursor: pointer;">
          <svg width="34" height="42" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0C5.37258 0 0 5.37258 0 12C0 20.5 12 32 12 32C12 32 24 20.5 24 12C24 5.37258 18.6274 0 12 0Z" fill="${pinColor}" stroke="#FFFFFF" stroke-width="${isSelected ? 3 : 2}"/>
            <circle cx="12" cy="12" r="5" fill="#FFFFFF"/>
          </svg>
          <div style="position: absolute; top: -6px; right: -8px; background: #0a2540; color: white; font-family: sans-serif; font-size: 10px; font-weight: 700; border-radius: 9999px; min-width: 18px; height: 18px; display: flex; items-center; justify-content: center; padding: 0 4px; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);">
            ${inc.observation_count}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: "civitas-severity-marker",
        html: iconHtml,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = L.marker([inc.lat, inc.lng], { icon: customIcon }).addTo(group);

      // Popup Content
      const popupHtml = `
        <div style="font-family: sans-serif; padding: 4px; max-width: 260px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
            <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: ${pinColor}; background: ${pinColor}15; padding: 2px 6px; border-radius: 4px; border: 1px solid ${pinColor}30;">
              ${inc.severity}
            </span>
            <span style="font-size: 11px; color: #64748B;">
              ${inc.observation_count} ${inc.observation_count === 1 ? "report" : "reports"}
            </span>
          </div>

          <h3 style="font-size: 13px; font-weight: 700; color: #0a2540; margin: 0 0 4px 0; line-height: 1.3;">
            ${inc.title}
          </h3>

          <p style="font-size: 11px; color: #475569; margin: 0 0 10px 0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${inc.summary || "Incident reported."}
          </p>

          <a href="/dashboard/incidents/${inc.id}" style="display: block; text-align: center; background: #028090; color: #FFFFFF; font-size: 11px; font-weight: 700; text-decoration: none; padding: 7px 10px; border-radius: 8px;">
            Open Incident Details →
          </a>
        </div>
      `;

      marker.bindPopup(popupHtml, { minWidth: 220 });

      marker.on("click", () => {
        if (onSelectIncident) {
          onSelectIncident(inc.id);
        }
      });

      markerMapRef.current.set(inc.id, marker);
    });

    if (bounds.isValid() && !selectedIncidentId) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }

  return (
    <div className={className}>
      <div ref={mapContainerRef} className="h-full w-full z-0" />
    </div>
  );
}
