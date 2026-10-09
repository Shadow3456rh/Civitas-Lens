"use client";

/**
 * Incident Intelligence Detail & Audit Console (/dashboard/incidents/[id])
 *
 * Clean, printable layout featuring:
 * - Header with title, status badge, severity, category, observation count
 * - Status changer (New -> Under Review -> Active -> Resolved -> Archived) with timeline logging
 * - AI summary card labeled "AI-generated summary"
 * - Multi-observation incident detail Leaflet map
 * - Evidence grid with signed URLs, evidence badges, and "Why linked?" explainability expanders
 * - Human correction: "Detach this observation" action moving it to a new incident
 * - Vertical immutable audit timeline from incident_events
 */

import React, { useState, useEffect, use, Suspense, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Badge, Skeleton, Alert } from "@/components/ui";
import { EvidenceBadge } from "@/components/evidence-badge";
import { IncidentDetailMap } from "@/components/map";
import {
  ArrowLeft,
  Printer,
  Sparkles,
  MapPin,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Scissors,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

interface IncidentDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

interface ObservationRecord {
  id: string;
  reference_code?: string | null;
  user_category?: string | null;
  user_urgency?: string | null;
  raw_text?: string | null;
  image_path?: string | null;
  image_signed_url?: string | null;
  location_label?: string | null;
  location_context?: string | null;
  location_accuracy_m?: number | null;
  capture_source?: string | null;
  location_source?: string | null;
  category?: string | null;
  severity?: "low" | "medium" | "high" | "critical" | null;
  summary?: string | null;
  key_entities?: string[] | null;
  observed_at: string;
  created_at: string;
  lat: number | null;
  lng: number | null;
}

interface IncidentEventRecord {
  id: string;
  incident_id: string;
  observation_id?: string | null;
  type: "created" | "observation_added" | "status_changed" | "summary_updated" | "severity_changed";
  note?: string | null;
  created_at: string;
}

interface LinkDecisionRecord {
  id: string;
  observation_id: string;
  candidate_incident_id: string;
  gemma_related: boolean;
  gemma_reason?: string | null;
  passed_validation: boolean;
  distance_m?: number | null;
  time_diff_min?: number | null;
  created_at: string;
}

interface IncidentDetailData {
  incident: {
    id: string;
    title: string;
    category: string;
    severity: "low" | "medium" | "high" | "critical";
    status: "new" | "under_review" | "active" | "resolved" | "archived";
    summary?: string | null;
    first_seen_at: string;
    last_seen_at: string;
    observation_count: number;
    lat: number;
    lng: number;
  };
  observations: ObservationRecord[];
  events: IncidentEventRecord[];
  linkDecisionsByObservation: Record<string, LinkDecisionRecord[]>;
}

function IncidentDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [data, setData] = useState<IncidentDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Status Changer State
  const [currentStatus, setCurrentStatus] = useState<string>("new");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Expanders for "Why linked?" and citizen description
  const [expandedDecisions, setExpandedDecisions] = useState<Record<string, boolean>>({});
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});

  // Detaching state
  const [detachingObsId, setDetachingObsId] = useState<string | null>(null);
  const [detachConfirmId, setDetachConfirmId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Load Incident Intelligence Data
  // ---------------------------------------------------------------------------
  const loadIncident = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/incidents/${id}`);
      if (!res.ok) {
        throw new Error(`Incident not found (HTTP ${res.status})`);
      }
      const json: IncidentDetailData = await res.json();
      setData(json);
      setCurrentStatus(json.incident.status);
    } catch (err: any) {
      console.error("Failed to load incident detail:", err);
      setFetchError(err.message || "Failed to load incident record.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadIncident();
  }, [id]);

  // ---------------------------------------------------------------------------
  // Status Changer Handler
  // ---------------------------------------------------------------------------
  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus) return;
    setIsUpdatingStatus(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/incidents/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || "Status update failed");
      }

      setCurrentStatus(newStatus);
      setStatusMessage(`Status updated to ${newStatus.replace(/_/g, " ")}.`);
      // Reload timeline events and incident state
      loadIncident();
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      console.error("Status transition error:", err);
      alert(`Could not update status: ${err.message}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Detach Observation (False Merge Correction)
  // ---------------------------------------------------------------------------
  const handleDetachObservation = async (observationId: string) => {
    setDetachingObsId(observationId);
    try {
      const res = await fetch(`/api/incidents/${id}/detach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observation_id: observationId }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || "Detachment failed");
      }

      const resJson = await res.json();
      setDetachConfirmId(null);

      // If this incident has remaining observations, refresh; otherwise go to the newly created incident
      if (resJson.remaining_observations > 0) {
        loadIncident();
        alert(`Observation detached! A new independent incident has been initialized (${resJson.new_incident_id.slice(0, 8)}...).`);
      } else {
        router.push(`/dashboard/incidents/${resJson.new_incident_id}`);
      }
    } catch (err: any) {
      console.error("Detachment error:", err);
      alert(`Failed to detach observation: ${err.message}`);
    } finally {
      setDetachingObsId(null);
    }
  };

  const toggleDecisionExpander = (obsId: string) => {
    setExpandedDecisions((prev) => ({
      ...prev,
      [obsId]: !prev[obsId],
    }));
  };

  const toggleDescriptionExpander = (obsId: string) => {
    setExpandedDescriptions((prev) => ({
      ...prev,
      [obsId]: !prev[obsId],
    }));
  };

  // ---------------------------------------------------------------------------
  // Loading & Error States
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 md:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (fetchError || !data) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-bold text-slate-900">Incident Not Found</h1>
        <p className="text-xs text-slate-500">{fetchError || "The requested incident record could not be located."}</p>
        <Link href="/dashboard" className="inline-flex items-center text-xs font-semibold text-[#1D3557] hover:underline">
          <ArrowLeft className="w-4 h-4 mr-1" /> Return to Dashboard
        </Link>
      </div>
    );
  }

  const { incident, observations, events, linkDecisionsByObservation } = data;

  const formattedCategory = incident.category
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation & Print Controls */}
        <div className="flex items-center justify-between no-print">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-xs font-semibold text-[#1D3557] hover:text-[#162842] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Incident List
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              Print Incident Record
            </button>
          </div>
        </div>

        {/* ===================================================================
            HEADER: Title, Badges, Time Range, Observation Count
           =================================================================== */}
        <header className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge severity={incident.severity} />
                <Badge status={currentStatus as any} />
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {formattedCategory}
                </span>
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  {incident.observation_count} {incident.observation_count === 1 ? "Observation" : "Observations"}
                </span>
              </div>

              <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-snug">
                {incident.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  First seen: {new Date(incident.first_seen_at).toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Last updated: {new Date(incident.last_seen_at).toLocaleString()}
                </span>
              </div>
            </div>

            {/* STATUS CHANGER (New -> Under Review -> Active -> Resolved -> Archived) */}
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg space-y-1.5 md:min-w-[220px] shrink-0 no-print">
              <label htmlFor="status-select" className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                Change Status
              </label>
              <select
                id="status-select"
                value={currentStatus}
                disabled={isUpdatingStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full h-9 rounded border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1D3557] disabled:opacity-50"
              >
                <option value="new">New</option>
                <option value="under_review">Under Review</option>
                <option value="active">Active</option>
                <option value="resolved">Resolved</option>
                <option value="archived">Archived</option>
              </select>
              {statusMessage && (
                <p className="text-[11px] text-emerald-700 font-medium">{statusMessage}</p>
              )}
            </div>
          </div>
        </header>

        {/* ===================================================================
            TOP GRID: AI Summary Card + Incident Map
           =================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* AI-Generated Summary Card */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1D3557] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#1D3557]" />
                AI-Generated Summary
              </span>
              <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Gemma 4 Intelligence Synthesis
              </span>
            </div>

            <p className="text-sm text-slate-800 leading-relaxed font-sans">
              {incident.summary || "No synthesized intelligence summary available."}
            </p>

            <div className="pt-2 flex items-center gap-2 text-[11px] text-slate-500 border-t border-slate-100">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Synthesized from {incident.observation_count} verified citizen observation{incident.observation_count === 1 ? "" : "s"}.
              </span>
            </div>
          </div>

          {/* Small Incident Multi-Observation Map */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#1D3557]" />
                Cluster Geography
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {incident.lat.toFixed(4)}, {incident.lng.toFixed(4)}
              </span>
            </div>

            <IncidentDetailMap
              centroidLat={incident.lat}
              centroidLng={incident.lng}
              title={incident.title}
              observations={observations
                .filter((o) => o.lat !== null && o.lng !== null)
                .map((o) => ({
                  id: o.id,
                  lat: o.lat!,
                  lng: o.lng!,
                  location_label: o.location_label,
                  summary: o.summary,
                }))}
              className="h-44 w-full rounded border border-slate-200"
            />
          </div>
        </div>

        {/* ===================================================================
            EVIDENCE GRID (Observations with Signed Images & Why-Linked Expander)
           =================================================================== */}
        <section className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Observation Evidence ({observations.length})
              </h2>
              <p className="text-xs text-slate-500">
                Original citizen field reports correlated into this incident cluster.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {observations.map((obs, idx) => {
              const decisions = linkDecisionsByObservation[obs.id] || [];
              const isDecisionExpanded = !!expandedDecisions[obs.id];
              const isDetaching = detachingObsId === obs.id;

              return (
                <div
                  key={obs.id}
                  className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3 relative flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Observation Top Strip */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded">
                          #{idx + 1}
                        </span>
                        {obs.reference_code && (
                          <Link
                            href={`/dashboard/reports/${obs.id}`}
                            className="text-xs font-mono font-bold text-[#1D3557] bg-blue-50 border border-blue-200 hover:border-blue-400 px-2 py-0.5 rounded transition-colors inline-flex items-center gap-1"
                            title="Open full report inspection"
                          >
                            <span>{obs.reference_code}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </Link>
                        )}
                        <EvidenceBadge
                          captureSource={obs.capture_source}
                          locationSource={obs.location_source}
                          accuracyM={obs.location_accuracy_m}
                        />
                        {obs.user_urgency && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                              obs.user_urgency === "high"
                                ? "bg-rose-100 text-rose-800 border border-rose-200"
                                : obs.user_urgency === "medium"
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {obs.user_urgency} urgency
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {obs.id.slice(0, 8)}...
                      </span>
                    </div>

                    {/* Image Evidence (via signed URL) */}
                    {obs.image_signed_url ? (
                      <div className="relative rounded overflow-hidden border border-slate-200 bg-black max-h-48">
                        <img
                          src={obs.image_signed_url}
                          alt="Observation field evidence"
                          className="w-full h-44 object-cover"
                        />
                      </div>
                    ) : (
                      <div className="p-3 rounded bg-white border border-slate-200 text-xs text-slate-500 italic">
                        No photograph provided (Text-only submission)
                      </div>
                    )}

                    {/* Text Description (Collapsed to 3 lines with "Read more") */}
                    {obs.raw_text && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-slate-700">Citizen Complaint / Report:</p>
                          {obs.user_category && (
                            <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {obs.user_category}
                            </span>
                          )}
                        </div>
                        <div className="bg-white p-2.5 rounded border border-slate-200">
                          <p
                            className={`text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-line ${
                              !expandedDescriptions[obs.id] ? "line-clamp-3" : ""
                            }`}
                          >
                            {obs.raw_text}
                          </p>
                          {(obs.raw_text.length > 140 || obs.raw_text.includes("\n")) && (
                            <button
                              type="button"
                              onClick={() => toggleDescriptionExpander(obs.id)}
                              className="text-[11px] font-bold text-[#1D3557] hover:underline mt-1.5 inline-flex items-center gap-1"
                            >
                              {expandedDescriptions[obs.id] ? "Show less" : "Read more"}
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Location & Time Info */}
                    <div className="text-[11px] text-slate-600 space-y-0.5">
                      {obs.location_label && (
                        <p className="flex items-center gap-1 font-medium text-slate-800">
                          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          {obs.location_label}
                        </p>
                      )}
                      <p className="flex items-center gap-1 text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        Observed: {new Date(obs.observed_at).toLocaleString()}
                      </p>
                    </div>

                    {/* WHY LINKED? EXPANDER */}
                    <div className="border-t border-slate-200 pt-2.5">
                      <button
                        type="button"
                        onClick={() => toggleDecisionExpander(obs.id)}
                        className="w-full flex items-center justify-between text-xs font-semibold text-[#1D3557] hover:text-[#162842] py-1"
                      >
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          Why linked? (AI Explainability)
                        </span>
                        {isDecisionExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>

                      {isDecisionExpanded && (
                        <div className="mt-2 p-3 rounded bg-white border border-slate-200 text-xs space-y-2 font-sans animate-fade-in">
                          {decisions.length > 0 ? (
                            decisions.map((dec) => (
                              <div key={dec.id} className="space-y-1.5 border-b border-slate-100 last:border-b-0 pb-1.5 last:pb-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold uppercase text-slate-500">
                                    Gemma Correlation Decision
                                  </span>
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                      dec.passed_validation
                                        ? "bg-emerald-100 text-emerald-800"
                                        : "bg-amber-100 text-amber-800"
                                    }`}
                                  >
                                    {dec.passed_validation ? "Validation Passed" : "Pending Verification"}
                                  </span>
                                </div>

                                <p className="text-xs text-slate-700 italic">
                                  "{dec.gemma_reason || "Correlated based on spatial and category rules."}"
                                </p>

                                <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                                  {dec.distance_m !== null && dec.distance_m !== undefined && (
                                    <span>Distance: ~{Math.round(dec.distance_m)}m</span>
                                  )}
                                  {dec.time_diff_min !== null && dec.time_diff_min !== undefined && (
                                    <span>Time gap: ~{Math.round(dec.time_diff_min)} min</span>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-500 italic">
                              Initial observation that formed this incident cluster.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* DETACH OBSERVATION BUTTON (False merge correction) */}
                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between no-print">
                    {detachConfirmId === obs.id ? (
                      <div className="w-full flex items-center justify-between gap-2 p-2 bg-rose-50 border border-rose-200 rounded text-xs">
                        <span className="text-rose-800 font-medium text-[11px]">Detach into new incident?</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={isDetaching}
                            onClick={() => handleDetachObservation(obs.id)}
                            className="px-2 py-1 bg-rose-600 text-white font-bold rounded text-[11px] hover:bg-rose-700 disabled:opacity-50"
                          >
                            {isDetaching ? "Detaching…" : "Confirm"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDetachConfirmId(null)}
                            className="px-2 py-1 bg-white text-slate-700 border border-slate-300 rounded text-[11px] hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDetachConfirmId(obs.id)}
                        className="text-[11px] text-rose-700 hover:text-rose-900 font-semibold flex items-center gap-1 hover:underline"
                        title="Detach observation and move to a new incident (human correction)"
                      >
                        <Scissors className="w-3.5 h-3.5" />
                        Detach this observation (false merge)
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ===================================================================
            VERTICAL TIMELINE (from incident_events)
           =================================================================== */}
        <section className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-base font-bold text-slate-900">Incident Audit Timeline</h2>
            <p className="text-xs text-slate-500">
              Immutable sequence of system decisions, analyst overrides, and updates.
            </p>
          </div>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {events.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No timeline events recorded yet.</p>
            ) : (
              events.map((evt) => {
                let badgeColor = "bg-[#1D3557]";
                let title = "Event Logged";

                if (evt.type === "created") {
                  badgeColor = "bg-emerald-600";
                  title = "Incident Created";
                } else if (evt.type === "observation_added") {
                  badgeColor = "bg-blue-600";
                  title = "Observation Merged";
                } else if (evt.type === "status_changed") {
                  badgeColor = "bg-indigo-600";
                  title = "Status Changed";
                } else if (evt.type === "summary_updated") {
                  badgeColor = "bg-amber-600";
                  title = "Summary Regenerated";
                } else if (evt.type === "severity_changed") {
                  badgeColor = "bg-rose-600";
                  title = "Severity Escalated";
                }

                return (
                  <div key={evt.id} className="relative space-y-1">
                    {/* Circle Node */}
                    <div
                      className={`absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${badgeColor}`}
                    />

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{title}</span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(evt.created_at).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 font-sans leading-relaxed">
                      {evt.note || "System event occurred."}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function IncidentDetailSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-6 w-36" />
      <Skeleton className="h-24 w-full" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-48 lg:col-span-2" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}

function PageInner({ params }: IncidentDetailPageProps) {
  const { id } = use(params);
  return <IncidentDetailContent id={id} />;
}

export default function IncidentDetailPage(props: IncidentDetailPageProps) {
  return (
    <Suspense fallback={<IncidentDetailSkeleton />}>
      <PageInner params={props.params} />
    </Suspense>
  );
}
