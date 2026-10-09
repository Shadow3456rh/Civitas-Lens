"use client";

/**
 * Evidence Metadata Badge
 *
 * Renders audit verification badges for observations on cards & dashboard:
 * - "Live capture · GPS ±12 m"
 * - "Uploaded photo · GPS"
 * - "Manual pin · unverified"
 *
 * Uses neutral styling by default; uses amber warning styling only for
 * unverified manual pins or low accuracy (> 150m) locations.
 */

import React from "react";
import { cn } from "@/lib/utils";
import { Camera, Image as ImageIcon, MapPin, AlertTriangle, ShieldCheck } from "lucide-react";

export interface EvidenceBadgeProps {
  captureSource?: "live_camera" | "gallery_upload" | string | null;
  locationSource?: "gps" | "manual_pin" | string | null;
  accuracyM?: number | null;
  className?: string;
}

export function formatEvidenceBadgeData(
  captureSource?: string | null,
  locationSource?: string | null,
  accuracyM?: number | null,
) {
  const isManualPin = locationSource === "manual_pin";
  const isLowAccuracy = accuracyM !== null && accuracyM !== undefined && accuracyM > 150;
  const isAmber = isManualPin || isLowAccuracy;

  let text = "";
  let Icon = ShieldCheck;

  if (isManualPin) {
    text = "Manual pin · unverified";
    Icon = AlertTriangle;
  } else {
    const accuracySnippet =
      accuracyM !== null && accuracyM !== undefined
        ? ` ±${Math.round(accuracyM)} m`
        : "";

    if (captureSource === "live_camera") {
      text = `Live capture · GPS${accuracySnippet}`;
      Icon = Camera;
    } else if (captureSource === "gallery_upload") {
      text = `Uploaded photo · GPS${accuracySnippet}`;
      Icon = ImageIcon;
    } else {
      text = `GPS verified${accuracySnippet}`;
      Icon = MapPin;
    }

    if (isLowAccuracy) {
      Icon = AlertTriangle;
    }
  }

  return { text, isAmber, Icon };
}

export function EvidenceBadge({
  captureSource,
  locationSource,
  accuracyM,
  className,
}: EvidenceBadgeProps) {
  const { text, isAmber, Icon } = formatEvidenceBadgeData(
    captureSource,
    locationSource,
    accuracyM,
  );

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded border select-none transition-colors",
        isAmber
          ? "bg-amber-50 text-amber-900 border-amber-300"
          : "bg-slate-100 text-slate-800 border-slate-300",
        className,
      )}
    >
      <Icon className={cn("w-3 h-3 shrink-0", isAmber ? "text-amber-700" : "text-slate-600")} />
      <span>{text}</span>
    </span>
  );
}
