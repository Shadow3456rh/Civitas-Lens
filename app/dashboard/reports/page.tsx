"use client";

/**
 * Analyst & Admin Reports Operations Table (/dashboard/reports)
 *
 * Dedicated view for managing individual citizen observations:
 * - Table of individual reports: reference code, thumbnail, category, urgency, location, processing status, linked incident
 * - Filters: category, urgency, processing status, linked/unlinked, search, date range
 * - "Needs attention" tab with instant "Re-run AI analysis" action
 * - Row click opens /dashboard/reports/[id]
 */

import React, { useState, useEffect, useCallback, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input, Badge, Skeleton, Alert } from "@/components/ui";
import {
  Search,
  Filter,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Shield,
  Layers,
  MapPin,
  Camera,
  RotateCw,
} from "lucide-react";

interface ReportItem {
  id: string;
  reference_code: string;
  user_category?: string | null;
  user_urgency?: "low" | "medium" | "high" | null;
  category?: string | null;
  severity?: "low" | "medium" | "high" | "critical" | null;
  summary?: string | null;
  raw_text: string;
  location_label?: string | null;
  processing_status: "pending" | "processed" | "needs_review" | "failed";
  incident_id?: string | null;
  created_at: string;
  image_signed_url?: string | null;
  incidents?: {
    id: string;
    title: string;
    status: string;
  } | null;
}

export default function ReportsDashboardPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Tab: 'all' | 'needs_attention'
  const [activeTab, setActiveTab] = useState<"all" | "needs_attention">("all");

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedUrgency, setSelectedUrgency] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedLinked, setSelectedLinked] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Data
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      if (selectedUrgency !== "all") params.set("urgency", selectedUrgency);
      if (selectedStatus !== "all") params.set("status", selectedStatus);
      if (selectedLinked !== "all") params.set("linked", selectedLinked);
      if (activeTab === "needs_attention") params.set("tab", "needs_attention");
      params.set("page", String(page));
      params.set("limit", "15");

      const res = await fetch(`/api/reports?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.total || 0);
      }
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedCategory, selectedUrgency, selectedStatus, selectedLinked, activeTab, page]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Re-run AI analysis
  const handleRerunAnalysis = async (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReprocessingId(reportId);
    setActionNotice(null);
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reprocess" }),
      });
      if (res.ok) {
        setActionNotice(`Re-analyzed report successfully.`);
        fetchReports();
      }
    } catch (err) {
      console.error("Reprocess error:", err);
    } finally {
      setReprocessingId(null);
    }
  };

  const getUrgencyBadge = (urgency?: string | null) => {
    switch (urgency) {
      case "high":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-300">High</span>;
      case "medium":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300">Med</span>;
      case "low":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-300">Low</span>;
      default:
        return <span className="text-[10px] text-slate-400">—</span>;
    }
  };

  const getStatusBadge = (status: ReportItem["processing_status"]) => {
    switch (status) {
      case "processed":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">Processed</span>;
      case "pending":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-sky-100 text-sky-800 border border-sky-300">Pending</span>;
      case "needs_review":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300">Needs Review</span>;
      case "failed":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-300">Failed</span>;
      default:
        return null;
    }
  };

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-slate-50 text-slate-900 pb-16">
      {/* Top Operations Header with Section Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-extrabold text-[#0a2540]">Operations Console</h1>
              <p className="text-xs text-slate-500">
                Manage correlated incidents and individual citizen observation reports.
              </p>
            </div>

            {/* Dashboard Sub-nav Tabs: Incidents vs Reports */}
            <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/90 self-start sm:self-auto">
              <Link
                href="/dashboard"
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-[#0a2540] transition-colors flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" />
                Incidents
              </Link>
              <Link
                href="/dashboard/reports"
                className="px-3.5 py-1.5 rounded-lg text-xs font-extrabold bg-[#f0fdfa] text-[#0a2540] shadow-xs border border-[#028090]/30 flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-[#028090]" />
                Reports ({totalCount})
              </Link>
            </div>
          </div>

          {/* Sub-tabs: All Reports vs Needs Attention */}
          <div className="flex items-center gap-6 mt-4 border-t border-slate-100 pt-3 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setActiveTab("all");
                setPage(1);
              }}
              className={`pb-1 border-b-2 transition-colors cursor-pointer ${
                activeTab === "all"
                  ? "border-[#028090] text-[#0a2540] font-extrabold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              All Reports
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("needs_attention");
                setPage(1);
              }}
              className={`pb-1 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === "needs_attention"
                  ? "border-amber-500 text-amber-900 font-extrabold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Needs Attention
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {/* Action Notice */}
        {actionNotice && (
          <Alert className="text-xs bg-emerald-50 border-emerald-300 text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-2" />
            {actionNotice}
          </Alert>
        )}

        {/* Filter Controls Bar */}
        <div className="bg-white rounded-lg border border-slate-200 p-3.5 shadow-xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {/* Search */}
            <div className="relative lg:col-span-2">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search descriptions, reference code, location…"
                className="pl-8 text-xs h-9"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="text-xs h-9 px-2.5 rounded-md border border-slate-300 bg-white text-slate-700 font-medium"
            >
              <option value="all">All Categories</option>
              <option value="infrastructure">Infrastructure</option>
              <option value="environmental">Environmental</option>
              <option value="safety_concern">Safety Concern</option>
              <option value="accident">Accident</option>
              <option value="unusual_activity">Unusual Activity</option>
              <option value="other">Other</option>
            </select>

            {/* Urgency Filter */}
            <select
              value={selectedUrgency}
              onChange={(e) => {
                setSelectedUrgency(e.target.value);
                setPage(1);
              }}
              className="text-xs h-9 px-2.5 rounded-md border border-slate-300 bg-white text-slate-700 font-medium"
            >
              <option value="all">All Urgencies</option>
              <option value="high">High Urgency</option>
              <option value="medium">Medium Urgency</option>
              <option value="low">Low Urgency</option>
            </select>

            {/* Linked Filter */}
            <select
              value={selectedLinked}
              onChange={(e) => {
                setSelectedLinked(e.target.value);
                setPage(1);
              }}
              className="text-xs h-9 px-2.5 rounded-md border border-slate-300 bg-white text-slate-700 font-medium"
            >
              <option value="all">All Linking States</option>
              <option value="linked">Linked to Incident</option>
              <option value="unlinked">Unlinked</option>
            </select>
          </div>
        </div>

        {/* Reports Table Card */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Ref Code</th>
                  <th className="py-3 px-3">Photo</th>
                  <th className="py-3 px-4">Category & Urgency</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Linked Incident</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="py-3 px-3"><Skeleton className="h-9 w-9 rounded" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-28" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-48" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-5 w-16" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="py-3 px-4 text-right"><Skeleton className="h-7 w-14 ml-auto" /></td>
                    </tr>
                  ))
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500 space-y-2">
                      <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-semibold text-slate-700">No citizen reports found</p>
                      <p className="text-[11px] text-slate-400">
                        {activeTab === "needs_attention"
                          ? "All reports have been successfully processed and verified."
                          : "Try adjusting your search criteria or filter options."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  reports.map((rep) => (
                    <tr
                      key={rep.id}
                      onClick={() => router.push(`/dashboard/reports/${rep.id}`)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Reference Code */}
                      <td className="py-3 px-4 font-mono font-extrabold text-[#0a2540] group-hover:text-[#028090] whitespace-nowrap transition-colors">
                        {rep.reference_code}
                      </td>

                      {/* Photo Thumbnail */}
                      <td className="py-3 px-3">
                        {rep.image_signed_url ? (
                          <img
                            src={rep.image_signed_url}
                            alt="Observation"
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                            <FileText className="w-4 h-4" />
                          </div>
                        )}
                      </td>

                      {/* Category & Urgency */}
                      <td className="py-3 px-4 space-y-1">
                        <span className="font-semibold text-slate-800 block truncate max-w-[140px]">
                          {rep.user_category || rep.category || "General"}
                        </span>
                        {getUrgencyBadge(rep.user_urgency)}
                      </td>

                      {/* Description */}
                      <td className="py-3 px-4 max-w-xs">
                        <p className="text-slate-700 line-clamp-2 leading-relaxed">
                          {rep.raw_text}
                        </p>
                      </td>

                      {/* Location */}
                      <td className="py-3 px-4 max-w-[160px]">
                        <span className="font-medium text-slate-800 truncate block">
                          {rep.location_label || "No place label"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(rep.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(rep.processing_status)}
                      </td>

                      {/* Linked Incident */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {rep.incident_id && rep.incidents ? (
                          <Link
                            href={`/dashboard/incidents/${rep.incident_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs text-[#028090] font-bold hover:text-[#00a896] transition-colors"
                          >
                            <span>Incident</span>
                            <ExternalLink className="w-3 h-3 text-[#028090]" />
                          </Link>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            Unlinked
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {(rep.processing_status === "needs_review" || rep.processing_status === "failed") ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={reprocessingId === rep.id}
                            onClick={(e) => handleRerunAnalysis(rep.id, e)}
                            className="text-xs h-7 px-2 border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-lg"
                          >
                            {reprocessingId === rep.id ? (
                              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                              <RotateCw className="w-3 h-3 mr-1" />
                            )}
                            Re-run
                          </Button>
                        ) : (
                          <Link
                            href={`/dashboard/reports/${rep.id}`}
                            className="text-xs text-[#028090] font-bold hover:text-[#00a896] transition-colors"
                          >
                            Details →
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50 text-xs">
              <span className="text-slate-500">
                Page {page} of {totalPages} ({totalCount} reports total)
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="h-8 px-2 text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-8 px-2 text-xs"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
