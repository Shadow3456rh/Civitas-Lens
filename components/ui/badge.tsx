import * as React from "react";
import { cn } from "@/lib/utils";

export type SeverityLevel = "low" | "medium" | "high" | "critical";
export type IncidentStatus =
  | "new"
  | "under_review"
  | "active"
  | "resolved"
  | "archived";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  severity?: SeverityLevel;
  status?: IncidentStatus;
  variant?: "default" | "secondary" | "outline";
  showDot?: boolean;
}

const severityConfig: Record<
  SeverityLevel,
  { label: string; container: string; dot: string }
> = {
  low: {
    label: "Low Severity",
    container: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-600",
  },
  medium: {
    label: "Medium Severity",
    container: "bg-amber-50 text-amber-900 border-amber-200",
    dot: "bg-amber-500",
  },
  high: {
    label: "High Severity",
    container: "bg-orange-50 text-orange-900 border-orange-200 font-medium",
    dot: "bg-orange-600",
  },
  critical: {
    label: "Critical Severity",
    container: "bg-red-50 text-red-900 border-red-200 font-semibold",
    dot: "bg-red-600",
  },
};

const statusConfig: Record<
  IncidentStatus,
  { label: string; container: string; dot: string }
> = {
  new: {
    label: "New",
    container: "bg-blue-50 text-blue-800 border-blue-200 font-medium",
    dot: "bg-blue-600",
  },
  under_review: {
    label: "Under Review",
    container: "bg-indigo-50 text-indigo-900 border-indigo-200",
    dot: "bg-indigo-600",
  },
  active: {
    label: "Active",
    container: "bg-amber-50 text-amber-900 border-amber-200 font-medium",
    dot: "bg-amber-600",
  },
  resolved: {
    label: "Resolved",
    container: "bg-emerald-50 text-emerald-900 border-emerald-200",
    dot: "bg-emerald-600",
  },
  archived: {
    label: "Archived",
    container: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-500",
  },
};

const variantStyles: Record<"default" | "secondary" | "outline", string> = {
  default: "bg-[#eef3f8] text-[#1d3557] border-slate-300 font-medium",
  secondary: "bg-slate-100 text-slate-800 border-slate-200",
  outline: "bg-transparent text-slate-700 border-slate-300",
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      severity,
      status,
      variant = "default",
      showDot = true,
      children,
      ...props
    },
    ref
  ) => {
    let styleClasses = variantStyles[variant];
    let dotClass = "bg-[#1d3557]";
    let defaultText: React.ReactNode = children;

    if (severity && severityConfig[severity]) {
      const config = severityConfig[severity];
      styleClasses = config.container;
      dotClass = config.dot;
      if (!children) defaultText = config.label;
    } else if (status && statusConfig[status]) {
      const config = statusConfig[status];
      styleClasses = config.container;
      dotClass = config.dot;
      if (!children) defaultText = config.label;
    }

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded border tracking-normal select-none transition-colors",
          styleClasses,
          className
        )}
        {...props}
      >
        {showDot && (severity || status) && (
          <span
            className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotClass)}
            aria-hidden="true"
          />
        )}
        <span>{defaultText}</span>
      </span>
    );
  }
);

Badge.displayName = "Badge";
