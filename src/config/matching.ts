/**
 * Matching & Correlation Business Rules Configuration
 *
 * Per PROJECT_CONTEXT:
 * "Put business rules (distance/time/category thresholds) in one config file."
 *
 * Rules govern spatial, temporal, and category compatibility thresholds
 * used by the incident correlation pipeline.
 */

import { ObservationCategory } from "../lib/llm/schemas";

export interface MatchingThresholds {
  /** Maximum spatial distance in metres for incident matching (default: 500m). */
  radiusMeters: number;
  /** Maximum temporal time window in hours for candidate matching (default: 24h). */
  windowHours: number;
  /** Minimum Gemma confidence score (secondary signal threshold; default: 0.45). */
  minGemmaConfidence: number;
}

export const MATCHING_CONFIG: MatchingThresholds = {
  radiusMeters: 500,
  windowHours: 24,
  minGemmaConfidence: 0.45,
};

/**
 * Category Compatibility Matrix
 *
 * Defines which categories are allowed to merge into the same incident cluster.
 * An exact match is always compatible. Related cross-domain categories (e.g.,
 * a water main burst classified under 'infrastructure' and street flooding classified
 * under 'environmental') are also compatible.
 */
export const CATEGORY_COMPATIBILITY_MAP: Record<ObservationCategory, ObservationCategory[]> = {
  accident: ["accident", "infrastructure", "safety_concern"],
  infrastructure: ["infrastructure", "safety_concern", "accident", "environmental"],
  safety_concern: ["safety_concern", "unusual_activity", "accident", "infrastructure"],
  environmental: ["environmental", "infrastructure", "safety_concern"],
  unusual_activity: ["unusual_activity", "safety_concern", "other"],
  other: ["other", "unusual_activity"],
};

/**
 * Check if two incident/observation categories are compatible for clustering.
 */
export function isCategoryCompatible(
  categoryA: string,
  categoryB: string,
): boolean {
  if (categoryA === categoryB) return true;
  const compatibleList = (CATEGORY_COMPATIBILITY_MAP as Record<string, string[]>)[categoryA];
  if (!compatibleList) return false;
  return compatibleList.includes(categoryB);
}

/**
 * Retrieve all compatible categories for a given observation category.
 */
export function getCompatibleCategories(category: ObservationCategory): string[] {
  return CATEGORY_COMPATIBILITY_MAP[category] || [category];
}

/**
 * Severity ranking weights for calculating max severity across observations.
 */
export const SEVERITY_WEIGHTS: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

/**
 * Returns the higher of two severities.
 */
export function maxSeverity(
  sevA: string | undefined | null,
  sevB: string | undefined | null,
): "low" | "medium" | "high" | "critical" {
  const weightA = (sevA && SEVERITY_WEIGHTS[sevA]) || 1;
  const weightB = (sevB && SEVERITY_WEIGHTS[sevB]) || 1;
  return weightA >= weightB ? ((sevA as any) || "low") : ((sevB as any) || "low");
}
