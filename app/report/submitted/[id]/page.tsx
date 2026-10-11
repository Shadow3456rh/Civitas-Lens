"use client";

/**
 * Report Submission Confirmation & Live Status Page (/report/submitted/[id])
 *
 * Shows:
 * - Reference ID with one-click copy button
 * - Plain-language confirmation message
 * - Live status stepper polling GET /api/observations/[id]:
 *     Received → Analysing → Linked to an existing incident / New incident created
 * - Calm handling for 'needs_review' and 'failed' states
 * - "Submit another report" button
 */

import React, { useState, useEffect, use, Suspense } from "react";
import Link from "next/link";
import { Badge, Skeleton } from "@/components/ui";
import { EvidenceBadge } from "@/components/evidence-badge";
import {
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  PlusCircle,
  Eye,
  Clock,
  User,
  Phone,
  FileText,
  MapPin,
} from "lucide-react";

interface SubmittedReportPageProps {
  params: Promise<{
    id: string;
  }>;
}

interface ObservationStatusData {
  id: string;
  reference_code?: string | null;
  status: "pending" | "processed" | "needs_review" | "failed";
  incident_id: string | null;
  user_category?: string | null;
  user_urgency?: string | null;
  reporter_name?: string | null;
  reporter_contact?: string | null;
  raw_text?: string | null;
  category?: string | null;
  severity?: "low" | "medium" | "high" | "critical" | null;
  summary?: string | null;
  location_label?: string | null;
  location_accuracy_m?: number | null;
  capture_source?: string | null;
  location_source?: string | null;
  captured_at?: string | null;
  observed_at?: string | null;
  incident?: {
    id: string;
    title: string;
    status: string;
    severity: string;
    summary: string;
    observation_count: number;
  } | null;
}

function SubmittedReportContent({ id }: { id: string }) {
  const [data, setData] = useState<ObservationStatusData | null>(null);
  const [copied, setCopied] = useState(false);

  // Poll GET /api/observations/[id] every 2.5s until processed or final state
  useEffect(() => {
    let isMounted = true;
    let pollTimer: NodeJS.Timeout;

    async function fetchStatus() {
      try {
        const res = await fetch(`/api/observations/${id}`);
        if (!res.ok) {
          throw new Error("Could not retrieve report status");
        }
        const json: ObservationStatusData = await res.json();
        if (isMounted) {
          setData(json);
          // Stop polling if final state reached
          if (json.status !== "pending") {
            return;
          }
        }
      } catch (err: any) {
        console.warn("Polling error:", err);
      }

      // Schedule next poll if still pending
      if (isMounted) {
        pollTimer = setTimeout(fetchStatus, 2500);
      }
    }

    fetchStatus();

    return () => {
      isMounted = false;
      clearTimeout(pollTimer);
    };
  }, [id]);

  const displayRefCode = data?.reference_code || id;

  const handleCopyId = () => {
    navigator.clipboard.writeText(displayRefCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const status = data?.status || "pending";
  const isPending = status === "pending";
  const isProcessed = status === "processed";
  const isReviewOrFailed = status === "needs_review" || status === "failed";

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm text-center space-y-3.5">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#f0fdfa] border border-[#ea580c]/30 flex items-center justify-center text-[#ea580c] shadow-xs">
          <CheckCircle2 className="w-7 h-7" />
        </div>

        <div className="space-y-1">
          <h1 className="text-xl font-extrabold text-[#0a2540]">Observation Received</h1>
          <p className="text-xs text-slate-500">
            Thank you for contributing to community awareness and safety.
          </p>
        </div>

        {/* Reference Code with Copy Button */}
        <div className="pt-2 space-y-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Tracking Reference Code
          </span>
          <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#f0fdfa] border border-[#ea580c]/30 text-sm font-mono font-extrabold text-[#0a2540] shadow-xs">
            <span className="tracking-wide">{displayRefCode}</span>
            <button
              type="button"
              onClick={handleCopyId}
              className="p-1 text-[#ea580c] hover:text-[#f97316] rounded active:scale-90 transition-transform"
              title="Copy reference code"
              aria-label="Copy reference code"
            >
              {copied ? (
                <Check className="w-4 h-4 text-[#f97316]" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Save this code to track response progress at any time.
          </p>
          {copied && <p className="text-[10px] text-[#f97316] font-bold animate-pulse">Reference code copied to clipboard</p>}
        </div>
      </div>

      {/* Live Status Stepper */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            Intelligence Engine Status
          </h2>
          {isPending && (
            <span className="flex items-center gap-1.5 text-xs text-[#ea580c] font-bold">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#f97316]" />
              Processing live…
            </span>
          )}
        </div>

        {/* Stepper Steps */}
        <div className="space-y-4 pl-1">
          {/* Step 1: Received */}
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[#ea580c] text-white flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-xs">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-[#0a2540]">1. Received & Logged</p>
              <p className="text-[11px] text-slate-500">Evidence and coordinates verified in system.</p>
            </div>
          </div>

          {/* Step 2: Analysing */}
          <div className="flex items-start gap-3">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-xs transition-colors ${
                isPending
                  ? "bg-[#f97316] text-white animate-pulse"
                  : isProcessed || isReviewOrFailed
                  ? "bg-[#ea580c] text-white"
                  : "bg-slate-200 text-slate-500"
              }`}
            >
              {isPending ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-[#0a2540]">2. Incident Analysis</p>
              <p className="text-[11px] text-slate-500">
                {isPending
                  ? "Extracting categories, severity, and entities…"
                  : data?.category
                  ? `Categorized as ${data.category.replace(/_/g, " ")} (${data.severity || "normal"} severity).`
                  : "Observation analyzed."}
              </p>
            </div>
          </div>

          {/* Step 3: Correlation Outcome */}
          <div className="flex items-start gap-3">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-xs transition-colors ${
                isProcessed
                  ? "bg-[#ea580c] text-white"
                  : isReviewOrFailed
                  ? "bg-amber-500 text-white"
                  : "bg-slate-200 text-slate-500"
              }`}
            >
              {isProcessed ? (
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              ) : isReviewOrFailed ? (
                <Clock className="w-3.5 h-3.5" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-slate-400" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-[#0a2540]">
                {isReviewOrFailed
                  ? "Queued for Analyst Review"
                  : isProcessed && data?.incident && data.incident.observation_count > 1
                  ? "Linked to Existing Incident"
                  : isProcessed
                  ? "New Incident Formed"
                  : "3. Spatial Correlation"}
              </p>
              <p className="text-[11px] text-slate-500">
                {isPending
                  ? "Matching with nearby open incidents within 500m..."
                  : isReviewOrFailed
                  ? "We've received your report and a person will review it."
                  : data?.incident?.title
                  ? `Assigned to: ${data.incident.title}`
                  : "Report resolved and stored in civic database."}
              </p>
            </div>
          </div>
        </div>

        {/* Calm Notice for Needs Review / Failed */}
        {isReviewOrFailed && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold">Human Review Queued</p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                We&apos;ve received your report and an analyst will review it. No further action is required from you.
              </p>
            </div>
          </div>
        )}

        {/* Successfully Processed Summary Card */}
        {isProcessed && data?.summary && (
          <div className="mt-4 p-4 rounded-xl bg-[#f0fdfa]/70 border border-[#ea580c]/25 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#ea580c]">AI Intelligence Summary</span>
              {data.severity && <Badge severity={data.severity} />}
            </div>
            <p className="text-xs text-slate-800 leading-relaxed font-sans">{data.summary}</p>
            {data.location_label && (
              <p className="text-[11px] text-slate-500 font-medium">Location: {data.location_label}</p>
            )}
          </div>
        )}

        {/* Evidence Verification Badge */}
        {data && (
          <div className="pt-2">
            <EvidenceBadge
              captureSource={data.capture_source}
              locationSource={data.location_source}
              accuracyM={data.location_accuracy_m}
            />
          </div>
        )}
      </div>

      {/* Report Details Card */}
      {data && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#ea580c]" />
              Report Details
            </h2>
            {(data.user_category || data.category) && (
              <span className="text-xs font-bold text-[#0a2540] bg-[#f0fdfa] border border-[#ea580c]/25 px-2.5 py-0.5 rounded-full">
                {data.user_category || data.category?.replace(/_/g, " ")}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 block flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#ea580c]" />
                Reporter Name
              </span>
              <p className="font-bold text-[#0a2540] text-sm">
                {data.reporter_name || "Not provided (Anonymous)"}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 block flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#ea580c]" />
                Contact Number
              </span>
              <p className="font-bold text-[#0a2540] text-sm">
                {data.reporter_contact || "Not provided"}
              </p>
            </div>
          </div>

          {data.raw_text && (
            <div className="space-y-1 pt-1">
              <span className="text-[11px] font-semibold text-slate-500 block">Reported Description</span>
              <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed whitespace-pre-wrap">
                {data.raw_text}
              </p>
            </div>
          )}

          {data.location_label && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600 pt-1">
              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span className="font-medium truncate">{data.location_label}</span>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2.5 pt-1">
        <Link
          href={`/track?code=${encodeURIComponent(displayRefCode)}`}
          className="w-full inline-flex items-center justify-center min-h-[46px] px-4 py-2 bg-orange-gradient shadow-orange-glow hover:opacity-95 text-white font-bold text-xs rounded-xl transition-all"
        >
          Track this report online
        </Link>

        <Link
          href="/report"
          className="w-full inline-flex items-center justify-center min-h-[44px] px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors shadow-xs"
        >
          <PlusCircle className="w-4 h-4 mr-2 text-[#ea580c]" />
          Submit another observation
        </Link>

        <Link
          href="/dashboard"
          className="w-full inline-flex items-center justify-center min-h-[44px] px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors shadow-xs"
        >
          <Eye className="w-4 h-4 mr-2 text-slate-400" />
          View incident dashboard
        </Link>
      </div>
    </div>
  );
}

function SubmittedReportSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 space-y-4 text-center">
        <Skeleton className="w-12 h-12 rounded-full mx-auto" />
        <Skeleton className="h-6 w-48 mx-auto" />
        <Skeleton className="h-4 w-64 mx-auto" />
      </div>
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

function PageInner({ params }: SubmittedReportPageProps) {
  const { id } = use(params);
  return <SubmittedReportContent id={id} />;
}

export default function SubmittedReportPage(props: SubmittedReportPageProps) {
  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-[#f8fafc] text-slate-900 py-8 px-4">
      <Suspense fallback={<SubmittedReportSkeleton />}>
        <PageInner params={props.params} />
      </Suspense>
    </main>
  );
}
