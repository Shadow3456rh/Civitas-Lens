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
import { Button, Badge, Skeleton } from "@/components/ui";
import { EvidenceBadge } from "@/components/evidence-badge";
import {
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  PlusCircle,
  Eye,
  Clock,
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
    <div className="max-w-md mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
          <CheckCircle2 className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <h1 className="text-xl font-bold text-[#1D3557]">Report Received</h1>
          <p className="text-xs text-slate-600">
            Thank you for contributing to community awareness and safety.
          </p>
        </div>

        {/* Reference Code with Copy Button */}
        <div className="pt-2 space-y-1.5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Tracking Reference Code
          </span>
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-slate-100 border border-slate-300 text-sm font-mono font-bold text-[#1D3557]">
            <span>{displayRefCode}</span>
            <button
              type="button"
              onClick={handleCopyId}
              className="p-1 hover:text-[#1D3557] rounded active:scale-95 transition-transform"
              title="Copy reference code"
              aria-label="Copy reference code"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4 text-slate-500" />
              )}
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Save this code to track response progress at any time.
          </p>
          {copied && <p className="text-[10px] text-emerald-600 font-medium">Reference code copied to clipboard</p>}
        </div>
      </div>

      {/* Live Status Stepper */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Intelligence Status
          </h2>
          {isPending && (
            <span className="flex items-center gap-1.5 text-xs text-amber-700 font-medium">
              <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
              Processing live…
            </span>
          )}
        </div>

        {/* Stepper Steps */}
        <div className="space-y-4 pl-1">
          {/* Step 1: Received */}
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-sm">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900">1. Received & Logged</p>
              <p className="text-xs text-slate-500">Evidence and coordinates verified in system.</p>
            </div>
          </div>

          {/* Step 2: Analysing */}
          <div className="flex items-start gap-3">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-sm transition-colors ${
                isPending
                  ? "bg-amber-500 text-white animate-pulse"
                  : isProcessed || isReviewOrFailed
                  ? "bg-emerald-500 text-white"
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
              <p className="text-sm font-semibold text-slate-900">2. Incident Analysis</p>
              <p className="text-xs text-slate-500">
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
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-sm transition-colors ${
                isProcessed
                  ? "bg-emerald-500 text-white"
                  : isReviewOrFailed
                  ? "bg-indigo-500 text-white"
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
              <p className="text-sm font-semibold text-slate-900">
                {isReviewOrFailed
                  ? "Queued for Analyst Review"
                  : isProcessed && data?.incident && data.incident.observation_count > 1
                  ? "Linked to Existing Incident"
                  : isProcessed
                  ? "New Incident Created"
                  : "3. Spatial Correlation"}
              </p>
              <p className="text-xs text-slate-500">
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
          <div className="mt-4 p-3 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-start gap-2">
            <Clock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold">Human Review Queued</p>
              <p className="text-indigo-800">
                We've received your report and a person will review it. No further action is required from you.
              </p>
            </div>
          </div>
        )}

        {/* Successfully Processed Summary Card */}
        {isProcessed && data?.summary && (
          <div className="mt-4 p-3.5 rounded-md bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-slate-500">AI Intelligence Summary</span>
              {data.severity && <Badge severity={data.severity} />}
            </div>
            <p className="text-xs text-slate-800 leading-relaxed font-sans">{data.summary}</p>
            {data.location_label && (
              <p className="text-[11px] text-slate-500">Location: {data.location_label}</p>
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

      {/* Action Buttons */}
      <div className="space-y-2.5">
        <Link
          href={`/track?code=${encodeURIComponent(displayRefCode)}`}
          className="w-full inline-flex items-center justify-center min-h-[48px] px-4 py-2 bg-[#1D3557] hover:bg-[#162842] text-white font-semibold text-sm rounded shadow transition-colors"
        >
          Track this report online
        </Link>

        <Link
          href="/report"
          className="w-full inline-flex items-center justify-center min-h-[44px] px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm rounded border border-slate-300 transition-colors"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Submit another report
        </Link>

        <Link
          href="/dashboard"
          className="w-full inline-flex items-center justify-center min-h-[44px] px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm rounded border border-slate-300 transition-colors"
        >
          <Eye className="w-4 h-4 mr-2 text-slate-500" />
          View incident dashboard
        </Link>
      </div>
    </div>
  );
}

function SubmittedReportSkeleton() {
  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4 text-center">
        <Skeleton className="w-12 h-12 rounded-full mx-auto" />
        <Skeleton className="h-6 w-48 mx-auto" />
        <Skeleton className="h-4 w-64 mx-auto" />
      </div>
      <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-3">
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
    <main className="min-h-[calc(100vh-3.5rem)] bg-slate-50 text-slate-900 py-8 px-4">
      <Suspense fallback={<SubmittedReportSkeleton />}>
        <PageInner params={props.params} />
      </Suspense>
    </main>
  );
}
