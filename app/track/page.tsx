"use client";

/**
 * Public Report Tracking Page (/track)
 *
 * Lets citizens enter their reference code (e.g. CL-2026-000123) to view
 * real-time resolution progress on their civic report without creating an account.
 *
 * Displays:
 * - Reference code input with instant search
 * - Read-only 4-stage status stepper:
 *     Received → Under review → Action in progress → Resolved
 * - Category, description snippet, location label, submitted time
 * - Linked municipal response status
 * - Privacy guarantee: No personal information displayed
 */

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Input, Alert, Skeleton } from "@/components/ui";
import {
  Search,
  CheckCircle2,
  Clock,
  Wrench,
  Check,
  AlertCircle,
  MapPin,
  Calendar,
  Shield,
  ArrowRight,
  FileText,
} from "lucide-react";

interface TrackingResult {
  reference_code: string;
  category: string;
  summary: string;
  location_label: string;
  submitted_at: string;
  processing_status: string;
  public_stage: "received" | "under_review" | "action_in_progress" | "resolved";
  incident_linked: boolean;
  incident_public_status: string | null;
}

const STAGES = [
  { id: "received", label: "Received", desc: "Report logged into system" },
  { id: "under_review", label: "Under review", desc: "AI intelligence analysis & staff triage" },
  { id: "action_in_progress", label: "Action in progress", desc: "Correlated to active response unit" },
  { id: "resolved", label: "Resolved", desc: "Incident inspected or addressed" },
] as const;

function TrackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialCode = searchParams.get("code") || "";

  const [inputCode, setInputCode] = useState(initialCode);
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchTracking = async (codeToSearch: string) => {
    if (!codeToSearch.trim()) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/reports/track?code=${encodeURIComponent(codeToSearch.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        setResult(null);
        setErrorMessage(data.error || "Report not found. Please verify your reference code.");
      } else {
        setResult(data);
      }
    } catch (err: any) {
      setResult(null);
      setErrorMessage("Unable to connect to the tracking server. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode) {
      fetchTracking(initialCode);
    }
  }, [initialCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    router.replace(`/track?code=${encodeURIComponent(inputCode.trim())}`);
    fetchTracking(inputCode.trim());
  };

  // Helper to determine active step in the 4-step stepper
  const getStageIndex = (stage: TrackingResult["public_stage"]) => {
    switch (stage) {
      case "received":
        return 0;
      case "under_review":
        return 1;
      case "action_in_progress":
        return 2;
      case "resolved":
        return 3;
      default:
        return 0;
    }
  };

  const currentStageIndex = result ? getStageIndex(result.public_stage) : -1;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Title & Introduction */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-[#1D3557]">Track Your Report</h1>
        <p className="text-xs text-slate-600 max-w-md mx-auto">
          Enter the reference code you received when submitting your observation to check municipal triage and response status.
        </p>
      </div>

      {/* Reference Code Search Box */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs space-y-3">
        <label htmlFor="ref-code" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Reference Code
        </label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              id="ref-code"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder="e.g. CL-2026-100001"
              className="pl-9 text-xs h-11 font-mono uppercase"
            />
          </div>
          <Button
            type="submit"
            disabled={isLoading || !inputCode.trim()}
            className="min-h-[44px] px-5 bg-[#1D3557] hover:bg-[#162842] text-white text-xs font-bold"
          >
            {isLoading ? "Searching…" : "Track"}
          </Button>
        </div>
        <p className="text-[11px] text-slate-400">
          Format: CL-YYYY-XXXXXX or report identifier. Case-insensitive.
        </p>
      </form>

      {/* Error Message */}
      {errorMessage && (
        <Alert variant="destructive" className="text-xs">
          <AlertCircle className="w-4 h-4 mr-2" />
          {errorMessage}
        </Alert>
      )}

      {/* Tracking Result View */}
      {result && (
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-6">
          {/* Card Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <span className="text-[11px] text-slate-500 uppercase font-semibold">Reference Code</span>
              <h2 className="text-base font-bold font-mono text-[#1D3557]">{result.reference_code}</h2>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 self-start sm:self-auto">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{new Date(result.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            </div>
          </div>

          {/* 4-Stage Stepper */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Resolution Progress
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
              {STAGES.map((stg, idx) => {
                const isPassed = idx < currentStageIndex;
                const isCurrent = idx === currentStageIndex;
                return (
                  <div
                    key={stg.id}
                    className={`p-3 rounded-lg border text-left space-y-1 transition-all ${
                      isCurrent
                        ? "bg-sky-50 border-[#1D3557] ring-2 ring-[#1D3557]/20 shadow-xs"
                        : isPassed
                        ? "bg-emerald-50/60 border-emerald-300 text-emerald-950"
                        : "bg-slate-50/50 border-slate-200 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold">
                        {idx + 1}. {stg.label}
                      </span>
                      {isPassed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                      {isCurrent && <Clock className="w-3.5 h-3.5 text-[#1D3557] animate-pulse shrink-0" />}
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      {stg.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Report Summary Details */}
          <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-slate-500 block">Category</span>
                <span className="font-semibold text-slate-800">{result.category}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Location</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span className="truncate">{result.location_label}</span>
                </span>
              </div>
            </div>

            <div className="pt-1 border-t border-slate-200">
              <span className="text-[11px] text-slate-500 block mb-1">Status Summary</span>
              <p className="text-slate-700 leading-relaxed bg-white p-2.5 rounded border border-slate-200">
                {result.summary}
              </p>
            </div>

            {result.incident_linked && result.incident_public_status && (
              <div className="pt-1 border-t border-slate-200 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Municipal Response Status:</span>
                <span className="font-bold text-[#1D3557] bg-sky-100 border border-sky-200 px-2 py-0.5 rounded">
                  {result.incident_public_status}
                </span>
              </div>
            )}
          </div>

          {/* Privacy Note */}
          <div className="bg-slate-100/80 rounded-md border border-slate-200 p-3 flex items-start gap-2 text-xs text-slate-500">
            <Shield className="w-4 h-4 text-[#1D3557] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              This is a read-only tracking view. To protect citizen privacy, reporter identity and contact information are never displayed publicly.
            </p>
          </div>
        </div>
      )}

      {/* Helpful Links */}
      <div className="text-center pt-2">
        <Link
          href="/report"
          className="inline-flex items-center text-xs text-[#1D3557] font-semibold hover:underline"
        >
          Have another issue to report?
          <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Link>
      </div>
    </div>
  );
}

export default function TrackPage() {
  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-slate-50 text-slate-900 py-10 px-4">
      <Suspense fallback={
        <div className="max-w-xl mx-auto space-y-4">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-28 w-full rounded-lg" />
        </div>
      }>
        <TrackContent />
      </Suspense>
    </main>
  );
}
