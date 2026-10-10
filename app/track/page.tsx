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
        <h1 className="text-2xl font-extrabold text-[#0c2340]">Track Your Observation</h1>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Enter the tracking reference code you received when submitting your observation to check municipal triage and response status.
        </p>
      </div>

      {/* Reference Code Search Box */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm space-y-3">
        <label htmlFor="ref-code" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Reference Code
        </label>
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              id="ref-code"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder="e.g. CL-2026-100001"
              className="pl-10 text-xs h-11 font-mono uppercase rounded-xl border-slate-200 focus:border-[#f47216] focus:ring-[#f47216]/20"
            />
          </div>
          <Button
            type="submit"
            variant="teal"
            disabled={isLoading || !inputCode.trim()}
            className="min-h-[44px] px-6 shadow-orange-glow text-white text-xs font-bold rounded-xl"
          >
            {isLoading ? "Searching…" : "Track"}
          </Button>
        </div>
        <p className="text-[11px] text-slate-400">
          Format: CL-YYYY-XXXXXX or observation ID. Case-insensitive.
        </p>
      </form>

      {/* Error Message */}
      {errorMessage && (
        <Alert variant="destructive" className="text-xs rounded-xl">
          <AlertCircle className="w-4 h-4 mr-2" />
          {errorMessage}
        </Alert>
      )}

      {/* Tracking Result View */}
      {result && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm space-y-6">
          {/* Card Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
            <div>
              <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Reference Code</span>
              <h2 className="text-lg font-extrabold font-mono text-[#0c2340]">{result.reference_code}</h2>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fff7ed] border border-[#f47216]/25 text-xs font-semibold text-[#ea580c] self-start sm:self-auto">
              <Calendar className="w-3.5 h-3.5 text-[#f47216]" />
              <span>{new Date(result.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            </div>
          </div>

          {/* 4-Stage Stepper */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-[#0c2340] uppercase tracking-wider">
              Resolution Progress
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1">
              {STAGES.map((stg, idx) => {
                const isPassed = idx < currentStageIndex;
                const isCurrent = idx === currentStageIndex;
                return (
                  <div
                    key={stg.id}
                    className={`p-3 rounded-xl border text-left space-y-1 transition-all ${
                      isCurrent
                        ? "bg-[#fff7ed] border-[#f47216] text-[#0c2340] ring-2 ring-[#f47216]/25 shadow-xs"
                        : isPassed
                        ? "bg-emerald-50/70 border-emerald-300 text-emerald-950"
                        : "bg-slate-50/60 border-slate-200 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold">
                        {idx + 1}. {stg.label}
                      </span>
                      {isPassed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                      {isCurrent && <Clock className="w-3.5 h-3.5 text-[#f47216] animate-pulse shrink-0" />}
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
          <div className="bg-[#f8fafc] rounded-xl border border-slate-200/90 p-4 space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Category</span>
                <span className="font-bold text-[#0c2340]">{result.category}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Location</span>
                <span className="font-bold text-[#0c2340] flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span className="truncate">{result.location_label}</span>
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/80">
              <span className="text-[11px] text-slate-400 block mb-1 font-medium">Status Summary</span>
              <p className="text-slate-800 leading-relaxed bg-white p-3 rounded-xl border border-slate-200/80">
                {result.summary}
              </p>
            </div>

            {result.incident_linked && result.incident_public_status && (
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">Municipal Response Status:</span>
                <span className="font-extrabold text-[#f47216] bg-[#0c2340] px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[10px]">
                  {result.incident_public_status}
                </span>
              </div>
            )}
          </div>

          {/* Privacy Note */}
          <div className="bg-[#fff7ed] rounded-xl border border-[#f47216]/20 p-3 flex items-start gap-2.5 text-xs text-[#0c2340]">
            <Shield className="w-4 h-4 text-[#f47216] shrink-0 mt-0.5" />
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
          className="inline-flex items-center text-xs text-[#f47216] font-bold hover:text-[#ea580c] transition-colors"
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
    <main className="min-h-[calc(100vh-3.5rem)] bg-[#f8fafc] text-slate-900 py-10 px-4">
      <Suspense fallback={
        <div className="max-w-xl mx-auto space-y-4">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
      }>
        <TrackContent />
      </Suspense>
    </main>
  );
}
