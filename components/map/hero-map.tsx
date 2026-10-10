"use client";

import React, { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

export default function HeroMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current) return;
      const L = (await import("leaflet")).default;
      if (!isMounted || !mapContainerRef.current) return;

      // Ensure clean state if re-rendered
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const nagpurCenter: [number, number] = [21.1458, 79.0882];

      const map = L.map(mapContainerRef.current, {
        center: nagpurCenter,
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
        dragging: false,
        doubleClickZoom: false,
        touchZoom: false,
      });

      mapInstanceRef.current = map;

      // OpenStreetMap standard tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      // Custom marker icon
      const defaultIcon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      L.marker([21.1458, 79.0882], { icon: defaultIcon }).addTo(map);
      L.marker([21.1558, 79.0982], { icon: defaultIcon }).addTo(map);
      L.marker([21.1358, 79.0782], { icon: defaultIcon }).addTo(map);

      setTimeout(() => {
        if (isMounted && mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 100);

      const handleResize = () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      };
      window.addEventListener("resize", handleResize);
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-[360px] bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-sm z-0">
      {/* Map container */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[360px]" />

      {!mounted && (
        <div className="absolute inset-0 bg-slate-100 animate-pulse z-10" />
      )}

      {/* Overlay UI: AI Connections */}
      <div className="absolute inset-0 pointer-events-none z-[400] flex items-center justify-center">
        {/* Dotted lines SVG */}
        <svg className="absolute inset-0 w-full h-full" style={{ filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.1))" }}>
          <path d="M 22% 32% Q 50% 15% 50% 50%" fill="none" stroke="#00a896" strokeWidth="2" strokeDasharray="5 5" className="animate-pulse" />
          <path d="M 78% 26% Q 78% 48% 50% 50%" fill="none" stroke="#00a896" strokeWidth="2" strokeDasharray="5 5" className="animate-pulse" />
          <path d="M 30% 78% Q 42% 62% 50% 50%" fill="none" stroke="#00a896" strokeWidth="2" strokeDasharray="5 5" className="animate-pulse" />
        </svg>

        {/* AI Center Node */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0a2540] text-white px-3.5 py-1.5 rounded-full text-xs font-bold border-2 border-[#00a896] shadow-xl flex items-center gap-2 whitespace-nowrap">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00a896] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00c49f]"></span>
          </span>
          AI finds possible connections
        </div>
        
        {/* Floating Cards */}
        <div className="absolute top-[20%] left-[8%] bg-white/95 backdrop-blur-sm p-2.5 rounded-lg shadow-lg border border-slate-200 text-[11px] font-semibold text-slate-700 flex items-center gap-2.5 max-w-[190px]">
          <div className="w-7 h-7 bg-rose-50 text-rose-600 rounded-md flex items-center justify-center text-sm shrink-0">🚧</div>
          <div>
            <div className="text-[#0a2540] font-bold leading-tight">Pothole Cluster</div>
            <div className="text-slate-500 font-normal text-[10px]">Ward 14 • 2 mins ago</div>
          </div>
        </div>

        <div className="absolute top-[14%] right-[8%] bg-white/95 backdrop-blur-sm p-2.5 rounded-lg shadow-lg border border-slate-200 text-[11px] font-semibold text-slate-700 flex items-center gap-2.5 max-w-[190px]">
          <div className="w-7 h-7 bg-blue-50 text-blue-600 rounded-md flex items-center justify-center text-sm shrink-0">💧</div>
          <div>
            <div className="text-[#0a2540] font-bold leading-tight">Water Main Leak</div>
            <div className="text-slate-500 font-normal text-[10px]">Civil Lines • 15m ago</div>
          </div>
        </div>

        <div className="absolute bottom-[14%] left-[14%] bg-white/95 backdrop-blur-sm p-2.5 rounded-lg shadow-lg border border-slate-200 text-[11px] font-semibold text-slate-700 flex items-center gap-2.5 max-w-[190px]">
          <div className="w-7 h-7 bg-amber-50 text-amber-600 rounded-md flex items-center justify-center text-sm shrink-0">🗑️</div>
          <div>
            <div className="text-[#0a2540] font-bold leading-tight">Overflowing Bin</div>
            <div className="text-slate-500 font-normal text-[10px]">Dharampeth • 1h ago</div>
          </div>
        </div>
      </div>
    </div>
  );
}
