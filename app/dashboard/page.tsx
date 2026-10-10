"use client";

/**
 * Analyst & Admin Incident Intelligence Dashboard (/dashboard)
 *
 * Layout:
 * - Left column: Filterable incident list (search, category, status, severity, date range)
 * - Right side: Leaflet map with markers colored by severity and clustered
 * - Supabase Realtime subscription for instant updates without page refresh
 * - Loading skeletons and helpful empty states
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input, Badge, Button, Skeleton } from "@/components/ui";
import { IncidentClusterMap, IncidentMapItem } from "@/components/map";
import { getBrowserSupabase } from "@/src/lib/supabase/client";
import {
  Search,
  Filter,
  Shield,
  Layers,
  AlertCircle,
  Clock,
  MapPin,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Radio,
  Sparkles,
} from "lucide-react";

const CATEGORIES = [
  { id: "all", label: "All Categories" },
  { id: "infrastructure", label: "Infrastructure" },
  { id: "safety_concern", label: "Safety Concern" },
  { id: "accident", label: "Accident" },
  { id: "environmental", label: "Environmental" },
  { id: "unusual_activity", label: "Unusual Activity" },
  { id: "other", label: "Other" },
];

const STATUSES = [
  { id: "all", label: "All Statuses" },
  { id: "new", label: "New" },
  { id: "under_review", label: "Under Review" },
  { id: "active", label: "Active" },
  { id: "resolved", label: "Resolved" },
  { id: "archived", label: "Archived" },
];

const SEVERITIES = [
  { id: "all", label: "All Severities" },
  { id: "critical", label: "Critical" },
  { id: "high", label: "High" },
  { id: "medium", label: "Medium" },
  { id: "low", label: "Low" },
];

const TIME_RANGES = [
  { id: "all", label: "All time" },
  { id: "24h", label: "Last 24h" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
];

export default function DashboardPage() {
  const router = useRouter();

  // Filter States
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  const [selectedTimeRange, setSelectedTimeRange] = useState("all");

  // Data & Loading States
  const [incidents, setIncidents] = useState<IncidentMapItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const [realtimeNotice, setRealtimeNotice] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch Incidents from API
  // ---------------------------------------------------------------------------
  const fetchIncidents = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      if (selectedStatus !== "all") params.set("status", selectedStatus);
      if (selectedSeverity !== "all") params.set("severity", selectedSeverity);
      if (selectedTimeRange !== "all") params.set("time_range", selectedTimeRange);

      const res = await fetch(`/api/incidents?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setIncidents(json.incidents || []);
      }
    } catch (err) {
      console.warn("Failed to load incidents:", err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [search, selectedCategory, selectedStatus, selectedSeverity, selectedTimeRange]);

  // Initial and on-filter fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchIncidents();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchIncidents]);

  // ---------------------------------------------------------------------------
  // Supabase Realtime Subscription
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;

    const channel = supabase
      .channel("civitas-dashboard-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incidents" },
        (payload) => {
          console.log("[Realtime] Incident changed:", payload.eventType);
          setRealtimeNotice("New incident activity detected");
          fetchIncidents(true);
          setTimeout(() => setRealtimeNotice(null), 4000);
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "observations" },
        () => {
          console.log("[Realtime] New observation submitted");
          setRealtimeNotice("New observation incoming");
          fetchIncidents(true);
          setTimeout(() => setRealtimeNotice(null), 4000);
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsRealtimeActive(true);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchIncidents]);

  // Quick stats
  const activeCount = useMemo(() => {
    return incidents.filter((i) => i.status === "active" || i.status === "new" || i.status === "under_review").length;
  }, [incidents]);

  const criticalCount = useMemo(() => {
    return incidents.filter((i) => i.severity === "critical" && i.status !== "resolved" && i.status !== "archived").length;
  }, [incidents]);

  return (
    <div className="flex-1 flex flex-col min-h-[calc(100vh-3.5rem)] bg-slate-100">
      {/* Analyst Header & Status Strip */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#0a2540] text-white text-xs font-bold tracking-wide uppercase shadow-xs">
              <Shield className="w-3.5 h-3.5 text-[#00c49f]" />
              Analyst Workspace
            </span>
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              Privileged Incident Correlation & Review Console
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Realtime Live Indicator */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded">
              <span
                className={`w-2 h-2 rounded-full ${
                  isRealtimeActive ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
                }`}
              />
              <span>{isRealtimeActive ? "Realtime Active" : "Connecting…"}</span>
            </div>

            {realtimeNotice && (
              <span className="text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded animate-fade-in flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                {realtimeNotice}
              </span>
            )}

            <button
              type="button"
              onClick={() => fetchIncidents(false)}
              className="p-1.5 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100 transition-colors"
              title="Refresh incidents"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs: Incidents vs Reports */}
        <div className="flex items-center gap-2 border-t border-slate-100 mt-2.5 pt-2 max-w-7xl mx-auto">
          <Link
            href="/dashboard"
            className="px-3.5 py-1.5 text-xs font-extrabold rounded-lg border-b-2 text-[#0a2540] border-[#028090] bg-[#f0fdfa] shadow-xs"
          >
            Incidents Workspace
          </Link>
          <Link
            href="/dashboard/reports"
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg text-slate-500 hover:text-[#0a2540] hover:bg-slate-50 transition-colors"
          >
            Citizen Reports
          </Link>
        </div>
      </div>

      {/* Main Split Layout: Left Column (List) + Right Column (Map) */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full overflow-hidden">
        {/* Left Column: Filterable List */}
        <section className="w-full lg:w-[480px] xl:w-[520px] bg-white border-r border-slate-200 flex flex-col h-[calc(100vh-6.5rem)]">
          {/* Filter Controls Header */}
          <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 space-y-2.5 shrink-0">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search incidents or keywords..."
                className="pl-9 text-xs h-9 bg-white rounded-xl border-slate-200 focus:border-[#028090] focus:ring-[#00a896]/20"
              />
            </div>

            {/* Filter Dropdowns Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#028090]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#028090]"
              >
                {STATUSES.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.label}
                  </option>
                ))}
              </select>

              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="h-8 rounded border border-slate-300 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1D3557]"
              >
                {SEVERITIES.map((sev) => (
                  <option key={sev.id} value={sev.id}>
                    {sev.label}
                  </option>
                ))}
              </select>

              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="h-8 rounded border border-slate-300 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1D3557]"
              >
                {TIME_RANGES.map((tr) => (
                  <option key={tr.id} value={tr.id}>
                    {tr.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Metrics Bar */}
            <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-200">
              <span className="font-semibold text-slate-700">
                {incidents.length} {incidents.length === 1 ? "incident" : "incidents"} shown
              </span>
              <div className="flex items-center gap-3">
                <span>{activeCount} active</span>
                {criticalCount > 0 && (
                  <span className="text-red-700 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                    {criticalCount} critical
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Incident List (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-slate-100">
            {isLoading ? (
              <div className="space-y-3 p-1">
                <Skeleton className="h-24 w-full rounded" />
                <Skeleton className="h-24 w-full rounded" />
                <Skeleton className="h-24 w-full rounded" />
                <Skeleton className="h-24 w-full rounded" />
              </div>
            ) : incidents.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <Filter className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-800">No matching incidents</p>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Try clearing filters or search terms to see open and historical incident clusters.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSelectedCategory("all");
                    setSelectedStatus("all");
                    setSelectedSeverity("all");
                    setSelectedTimeRange("all");
                  }}
                  className="text-xs font-bold text-[#028090] hover:text-[#00a896]"
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              incidents.map((incident) => {
                const isSelected = incident.id === selectedIncidentId;
                const formattedCategory = incident.category
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase());

                return (
                  <div
                    key={incident.id}
                    onClick={() => setSelectedIncidentId(incident.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#f0fdfa] border-[#028090] ring-2 ring-[#00a896]/20 shadow-xs"
                        : "bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xs"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h2 className="text-sm font-extrabold text-[#0a2540] leading-snug line-clamp-1">
                        {incident.title}
                      </h2>
                      <Badge severity={incident.severity} className="text-[10px] shrink-0" />
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 mb-2 leading-relaxed">
                      {incident.summary || "No synthesized summary available yet."}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <Badge status={incident.status as any} className="text-[10px]" />
                        <span className="font-semibold text-slate-700">{formattedCategory}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#0a2540] bg-[#f0fdfa] border border-[#028090]/25 px-2 py-0.5 rounded-full text-[10px]">
                          {incident.observation_count}{" "}
                          {incident.observation_count === 1 ? "obs" : "obs"}
                        </span>
                        <Link
                          href={`/dashboard/incidents/${incident.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[#028090] font-bold hover:text-[#00a896] flex items-center gap-0.5 transition-colors"
                          title="Open full incident record"
                        >
                          View <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Right Column: Interactive Map */}
        <section className="flex-1 h-[400px] lg:h-[calc(100vh-6.5rem)] relative bg-slate-200">
          <IncidentClusterMap
            incidents={incidents}
            selectedIncidentId={selectedIncidentId}
            onSelectIncident={(id) => setSelectedIncidentId(id)}
            className="h-full w-full"
          />

          {/* Floating Map Legend */}
          <div className="absolute bottom-4 left-4 z-[400] bg-white/95 backdrop-blur-sm border border-slate-300 p-2.5 rounded shadow-md text-xs space-y-1.5 select-none pointer-events-auto">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
              Severity Colors
            </p>
            <div className="flex items-center gap-3 text-[11px] font-medium text-slate-700">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" /> Critical
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EA580C]" /> High
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" /> Medium
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#059669]" /> Low
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
