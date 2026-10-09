import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "outline"
    | "ghost"
    | "destructive"
    | "link";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d3557] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:translate-y-[0.5px]";

    const variantStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
      primary:
        "bg-[#1d3557] text-white hover:bg-[#162842] active:bg-[#0f1d30] shadow-sm",
      secondary:
        "bg-[#457b9d] text-white hover:bg-[#386682] active:bg-[#2d526a] shadow-sm",
      outline:
        "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100 shadow-sm",
      ghost:
        "text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200",
      destructive:
        "bg-red-700 text-white hover:bg-red-800 active:bg-red-900 shadow-sm",
      link:
        "text-[#1d3557] underline-offset-4 hover:underline p-0 h-auto font-medium focus-visible:ring-offset-1 active:translate-y-0",
    };

    const sizeStyles: Record<NonNullable<ButtonProps["size"]>, string> = {
      sm: "h-8 px-3 text-xs gap-1.5",
      md: "min-h-[44px] h-11 px-4 text-sm gap-2", // 44px touch target per UI principles
      lg: "min-h-[44px] h-12 px-6 text-base gap-2.5",
      icon: "min-h-[44px] min-w-[44px] h-11 w-11 p-2.5",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={cn(
          baseStyles,
          variantStyles[variant],
          variant !== "link" && sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
