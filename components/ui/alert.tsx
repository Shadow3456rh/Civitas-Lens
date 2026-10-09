import * as React from "react";
import { cn } from "@/lib/utils";

export type AlertVariant = "info" | "success" | "warning" | "destructive";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  icon?: React.ReactNode;
}

const variantStyles: Record<
  AlertVariant,
  { container: string; iconColor: string; defaultIcon: React.ReactNode }
> = {
  info: {
    container: "bg-blue-50/70 border-blue-200 text-blue-950",
    iconColor: "text-blue-700",
    defaultIcon: (
      <svg
        className="h-5 w-5"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  success: {
    container: "bg-emerald-50/70 border-emerald-200 text-emerald-950",
    iconColor: "text-emerald-700",
    defaultIcon: (
      <svg
        className="h-5 w-5"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  warning: {
    container: "bg-amber-50/80 border-amber-200 text-amber-950",
    iconColor: "text-amber-700",
    defaultIcon: (
      <svg
        className="h-5 w-5"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
  },
  destructive: {
    container: "bg-red-50/80 border-red-200 text-red-950",
    iconColor: "text-red-700",
    defaultIcon: (
      <svg
        className="h-5 w-5"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
};

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "info", icon, children, ...props }, ref) => {
    const config = variantStyles[variant];
    const displayIcon = icon === undefined ? config.defaultIcon : icon;

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          "relative w-full rounded border p-4 text-sm flex gap-3.5 items-start",
          config.container,
          className
        )}
        {...props}
      >
        {displayIcon && (
          <div className={cn("shrink-0 mt-0.5", config.iconColor)}>
            {displayIcon}
          </div>
        )}
        <div className="flex-1 space-y-1">{children}</div>
      </div>
    );
  }
);
Alert.displayName = "Alert";

export const AlertTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn(
      "font-semibold leading-none tracking-tight text-slate-900 text-sm",
      className
    )}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

export const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-xs leading-relaxed text-slate-700 mt-1", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";
