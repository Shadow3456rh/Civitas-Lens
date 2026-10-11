import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      id,
      label,
      helperText,
      error,
      disabled,
      required,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const textareaId = id || generatedId;
    const helperId = `${textareaId}-helper`;
    const errorId = `${textareaId}-error`;

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-sm font-medium text-slate-800 flex items-center justify-between"
          >
            <span>
              {label}
              {required && (
                <span className="text-red-700 ml-1" aria-hidden="true">
                  *
                </span>
              )}
            </span>
          </label>
        )}

        <textarea
          id={textareaId}
          ref={ref}
          rows={rows}
          disabled={disabled}
          required={required}
          aria-invalid={!!error}
          aria-describedby={
            error ? errorId : helperText ? helperId : undefined
          }
          className={cn(
            "w-full px-3.5 py-2.5 text-sm bg-white text-slate-900 border rounded-xl transition-all resize-y min-h-[96px]",
            "placeholder:text-slate-400",
            "border-slate-300 hover:border-slate-400",
            "focus:outline-none focus:border-[#ea580c] focus:ring-2 focus:ring-[#f97316]/20",
            "disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed",
            error &&
              "border-red-600 focus:border-red-600 focus:ring-red-600 text-red-900",
            className
          )}
          {...props}
        />

        {error ? (
          <p
            id={errorId}
            role="alert"
            className="text-xs font-medium text-red-700"
          >
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-xs text-slate-500">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
