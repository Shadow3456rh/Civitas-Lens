"use client";

import * as React from "react";
import Link from "next/link";

export function Footer() {
  const [currentYear, setCurrentYear] = React.useState<number | string>(2026);

  React.useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="w-full bg-white border-t border-slate-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-[#1d3557]">
              <div className="w-6 h-6 rounded bg-[#1d3557] text-white flex items-center justify-center font-bold text-xs">
                <svg
                  className="w-3.5 h-3.5 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="8" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <span className="font-bold text-base tracking-tight">Civitas Lens</span>
            </div>
            <p className="text-xs text-slate-500 max-w-md">
              AI Incident-Intelligence Platform. See Beyond the Observation. Understand the Bigger Picture.
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600" aria-label="Footer navigation">
            <Link
              href="/report"
              className="hover:text-[#1d3557] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1d3557] rounded py-1"
            >
              Report Observation
            </Link>
            <Link
              href="/dashboard"
              className="hover:text-[#1d3557] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1d3557] rounded py-1"
            >
              Incident Dashboard
            </Link>
            <span className="text-slate-300" aria-hidden="true">|</span>
            <span className="text-slate-500">WCAG AA Compliant</span>
            <span className="text-slate-500">Light Theme Only</span>
          </nav>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[11px] text-slate-500">
          <p>
            © {currentYear} Civitas Lens. Official civic incident-intelligence system.
          </p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Intelligence Engine Online
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
