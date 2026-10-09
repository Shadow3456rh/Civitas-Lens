"use client";

/**
 * Analyst & Admin Report Detail View (/dashboard/reports/[id])
 *
 * Full observation inspection for municipal staff:
 * - Reference code and metadata header
 * - Photographic evidence (signed URL)
 * - Original description EXACTLY as written by the citizen
 * - Side-by-side comparison: User-selected vs AI-detected fields
 * - Location map, coordinates, accuracy badge, capture source
 * - Reporter contact information (staff-only)
 * - "Why linked?" decision log
 * - Actions: Link to incident, Detach from incident, Mark as reviewed / needs review, Re-run AI analysis
 */

import React, { useState, useEffect, use, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input, Badge, Skeleton, Alert } from "@/components/ui";
import { MapThumbnail } from "@/components/map";
import { EvidenceBadge } from "@/components/evidence-badge";
import {
  ArrowLeft,
  FileText,
  User,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Layers,
  Sparkles,
  Link2,
  Unlink,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  ExternalLink,
  Info,
  Camera,
} from "lucide-react";

interface ReportDetailProps {
  params: Promise<{
    id: string;
  }>;
}

interface ReportDetailData {
  id: string;
  reference_code: string;
  user_category?: string | null;
  user_urgency?: "low" | "medium" | "high" | null;
  category?: string | null;
  severity?: "low" | "medium" | "high" | "critical" | null;
  summary?: string | null;
  location_context?: string | null;
  key_entities?: string[] | null;
  raw_text: string;
  location_label?: string | null;
  location_accuracy_m?: number | null;
  capture_source?: string | null;
  location_source?: string | null;
  lat: number | null;
  lng: number | null;
  image_path?: string | null;
  image_signed_url?: string | null;
  processing_status: "pending" | "processed" | "needs_review" | "failed";
  incident_id?: string | null;
  reporter_name?: string | null;
  reporter_contact?: string | null;
  created_at: string;
  observed_at?: string | null;
  incident?: {
    id: string;
    title: string;
    category: string;
    severity: string;
    status: string;
    summary: string;
    observation_count: number;
  } | null;
  link_decisions: Array<{
    id: string;
    candidate_incident_id: string;
    gemma_related: boolean;
    gemma_reason?: string | null;
    passed_validation: boolean;
    distance_m?: number | null;
    time_diff_min?: number | null;
    created_at: string;
  }>;
}

function ReportDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = useState<ReportDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isActionPending, setIsActionPending] = useState(false);

  // Link to Incident Modal State
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [targetIncidentId, setTargetIncidentId] = useState("");

  const loadReport = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/reports/${id}`);
      if (!res.ok) {
        throw new Error(`Report not found (HTTP ${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load report details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [id]);

  const handleAction = async (action: string, extraBody = {}) => {
    setIsActionPending(true);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extraBody }),
      });
      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.error || "Action failed");
      }
      setActionSuccess(resJson.message || `Action completed.`);
      setShowLinkModal(false);
      loadReport();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsActionPending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="max-w-md mx-auto space-y-4 text-center py-12">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-800">Report Not Found</h2>
        <p className="text-xs text-slate-500">{errorMsg || "Invalid observation ID"}</p>
        <Link href="/dashboard/reports" className="inline-block text-xs font-semibold text-[#1D3557] underline">
          Return to Reports table
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="space-y-1">
          <Link
            href="/dashboard/reports"
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Reports table
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold font-mono text-[#1D3557]">
              {data.reference_code}
            </h1>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                data.processing_status === "processed"
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                  : data.processing_status === "needs_review"
                  ? "bg-amber-100 text-amber-900 border-amber-300"
                  : data.processing_status === "failed"
                  ? "bg-rose-100 text-rose-800 border-rose-300"
                  : "bg-sky-100 text-sky-800 border-sky-300"
              }`}
            >
              {data.processing_status.replace(/_/g, " ")}
            </span>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {data.incident_id ? (
            <Button
              size="sm"
              variant="outline"
              disabled={isActionPending}
              onClick={() => handleAction("detach")}
              className="text-xs border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              <Unlink className="w-3.5 h-3.5 mr-1 text-slate-500" />
              Detach from incident
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={isActionPending}
              onClick={() => setShowLinkModal(true)}
              className="text-xs border-[#1D3557] text-[#1D3557] hover:bg-slate-50 font-semibold"
            >
              <Link2 className="w-3.5 h-3.5 mr-1" />
              Link to incident…
            </Button>
          )}

          {data.processing_status === "needs_review" ? (
            <Button
              size="sm"
              variant="outline"
              disabled={isActionPending}
              onClick={() => handleAction("mark_reviewed")}
              className="text-xs bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              Mark as reviewed
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={isActionPending}
              onClick={() => handleAction("mark_needs_review")}
              className="text-xs border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100"
            >
              <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" />
              Flag for review
            </Button>
          )}

          <Button
            size="sm"
            disabled={isActionPending}
            onClick={() => handleAction("reprocess")}
            className="text-xs bg-[#1D3557] hover:bg-[#162842] text-white font-bold"
          >
            <RotateCw className="w-3.5 h-3.5 mr-1" />
            Re-run AI analysis
          </Button>
        </div>
      </div>

      {actionSuccess && (
        <Alert className="text-xs bg-emerald-50 border-emerald-300 text-emerald-900">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-2" />
          {actionSuccess}
        </Alert>
      )}

      {/* Main Grid: Left Column (Complaint & Comparison) / Right Column (Photo, Map, Contact) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Original Citizen Complaint (EXACTLY AS WRITTEN) */}
          <section className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#1D3557]" />
                Original Citizen Complaint (Unmodified)
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">
                {new Date(data.created_at).toLocaleString("en-US")}
              </span>
            </div>

            <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200 text-slate-800 text-xs leading-relaxed whitespace-pre-wrap font-sans">
              {data.raw_text}
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
              <span>
                <strong>User Category:</strong> {data.user_category || "None chosen"}
              </span>
              <span>·</span>
              <span>
                <strong>User Urgency:</strong>{" "}
                <span className="font-bold uppercase text-slate-700">
                  {data.user_urgency || "None"}
                </span>
              </span>
            </div>
          </section>

          {/* Card 2: AI Intelligence Analysis vs User Submission */}
          <section className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h2 className="text-sm font-bold text-[#1D3557] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                AI Intelligence & Verification
              </h2>
              <span className="text-[10px] text-slate-400 uppercase font-mono">Gemma 4 Verified</span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[11px] text-slate-500 uppercase font-semibold block">AI Category</span>
                <span className="font-bold text-slate-800 capitalize">{data.category || "Pending"}</span>
              </div>
              <div className="p-3 rounded bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[11px] text-slate-500 uppercase font-semibold block">AI Assessed Severity</span>
                {data.severity ? <Badge severity={data.severity} /> : <span className="text-slate-400">Pending</span>}
              </div>
            </div>

            {data.summary && (
              <div className="space-y-1 text-xs">
                <span className="text-[11px] font-bold text-slate-600 block">AI Plain-Language Summary</span>
                <p className="p-3 rounded bg-sky-50/60 border border-sky-200 text-slate-800 leading-relaxed">
                  {data.summary}
                </p>
              </div>
            )}

            {data.location_context && (
              <div className="space-y-1 text-xs">
                <span className="text-[11px] font-bold text-slate-600 block">Location Scene Context</span>
                <p className="text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200">
                  {data.location_context}
                </p>
              </div>
            )}

            {data.key_entities && data.key_entities.length > 0 && (
              <div className="space-y-1.5 text-xs">
                <span className="text-[11px] font-bold text-slate-600 block">Extracted Scene Entities</span>
                <div className="flex flex-wrap gap-1.5">
                  {data.key_entities.map((ent, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[11px]">
                      {ent}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Card 3: Link Decision Log (Why linked / unlinked?) */}
          <section className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
              <Layers className="w-4 h-4 text-slate-600" />
              Correlation Decision Log ({data.link_decisions.length})
            </h2>

            {data.link_decisions.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">
                No correlation comparisons evaluated. (Initial incident creation or out-of-bounds candidate search).
              </p>
            ) : (
              <div className="space-y-3">
                {data.link_decisions.map((dec) => (
                  <div key={dec.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700 font-mono">
                        Candidate Incident: {dec.candidate_incident_id.slice(0, 12)}…
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        dec.passed_validation
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : "bg-rose-100 text-rose-800 border-rose-300"
                      }`}>
                        {dec.passed_validation ? "Linked" : "Rejected"}
                      </span>
                    </div>

                    {dec.gemma_reason && (
                      <p className="text-slate-700 bg-white p-2 rounded border border-slate-200">
                        {dec.gemma_reason}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-[11px] text-slate-500 font-mono">
                      <span>Distance: ~{Math.round(dec.distance_m ?? 0)}m</span>
                      <span>·</span>
                      <span>Time gap: ~{Math.round(dec.time_diff_min ?? 0)}m</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right 1 Column: Evidence Photo, Location Map, Contact */}
        <div className="space-y-6">
          {/* Photo Evidence Card */}
          <section className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs space-y-3">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-[#1D3557]" />
              Photographic Evidence
            </h2>

            {data.image_signed_url ? (
              <div className="rounded-lg overflow-hidden border border-slate-200 bg-black">
                <img
                  src={data.image_signed_url}
                  alt="Observation evidence"
                  className="w-full h-auto max-h-60 object-contain mx-auto"
                />
              </div>
            ) : (
              <div className="p-6 text-center rounded bg-slate-50 border border-slate-200 text-xs text-slate-400">
                No photograph provided with report.
              </div>
            )}
          </section>

          {/* Location & Map Card */}
          <section className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs space-y-3">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#1D3557]" />
              Scene Location
            </h2>

            <div className="space-y-2 text-xs">
              <p className="font-bold text-slate-800">{data.location_label || "No place label"}</p>
              <p className="text-[11px] text-slate-500 font-mono">
                {data.lat !== null && data.lng !== null
                  ? `${data.lat.toFixed(5)}, ${data.lng.toFixed(5)}`
                  : "No coordinates"}
              </p>

              {data.lat !== null && data.lng !== null && (
                <MapThumbnail
                  lat={data.lat}
                  lng={data.lng}
                  accuracyM={data.location_accuracy_m}
                  className="h-36 w-full rounded border border-slate-200"
                />
              )}

              <div className="pt-1">
                <EvidenceBadge
                  captureSource={data.capture_source}
                  locationSource={data.location_source}
                  accuracyM={data.location_accuracy_m}
                />
              </div>
            </div>
          </section>

          {/* Staff-Only Reporter Contact Card */}
          <section className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs space-y-3">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-600" />
              Reporter Contact (Staff Eyes Only)
            </h2>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-800 font-medium">{data.reporter_name || "Anonymous reporter"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-800 font-mono">{data.reporter_contact || "No phone or email provided"}</span>
              </div>
              <p className="text-[10px] text-slate-400 pt-1 leading-relaxed">
                Protected by Civitas Lens privacy policies. Never displayed on public views.
              </p>
            </div>
          </section>

          {/* Linked Incident Card */}
          {data.incident && (
            <section className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs space-y-3">
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#1D3557]" />
                Associated Incident Cluster
              </h2>

              <div className="space-y-2 text-xs">
                <p className="font-bold text-[#1D3557]">{data.incident.title}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">Status: {data.incident.status}</span>
                  <span>·</span>
                  <span className="text-[11px] text-slate-500">{data.incident.observation_count} reports</span>
                </div>
                <Link
                  href={`/dashboard/incidents/${data.incident.id}`}
                  className="inline-flex items-center gap-1 text-xs text-[#1D3557] font-semibold hover:underline pt-1"
                >
                  View full incident file →
                </Link>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Link to Incident Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-300 p-5 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-[#1D3557]">Link Observation to Incident</h3>
            <p className="text-xs text-slate-600">
              Enter the target Incident UUID to merge this observation into that incident cluster:
            </p>
            <Input
              value={targetIncidentId}
              onChange={(e) => setTargetIncidentId(e.target.value)}
              placeholder="e.g. 712535c1-05da-4382-ba88-4c1cd0a0e5f6"
              className="text-xs font-mono"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setShowLinkModal(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!targetIncidentId.trim() || isActionPending}
                onClick={() => handleAction("link", { incident_id: targetIncidentId.trim() })}
                className="bg-[#1D3557] text-white"
              >
                Confirm Link
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PageInner({ params }: ReportDetailProps) {
  const { id } = use(params);
  return <ReportDetailContent id={id} />;
}

export default function ReportDetailPage(props: ReportDetailProps) {
  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-slate-50 text-slate-900 py-6 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      }>
        <PageInner params={props.params} />
      </Suspense>
    </main>
  );
}
