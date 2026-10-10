"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Footer() {
  const [currentYear, setCurrentYear] = React.useState<number | string>(2026);
  const pathname = usePathname();

  React.useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  // Hide footer on report flow for full-viewport immersive UI
  if (pathname === "/report" || pathname.startsWith("/report/")) return null;

  return (
    <footer className="w-full bg-[#0a2540] text-slate-300 border-t border-white/10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8 pb-8 border-b border-white/10">
          <div className="flex flex-col gap-3 max-w-sm">
            <Link href="/" className="inline-block transition-transform hover:scale-[1.02]">
              <img
                src="/logo.png"
                alt="Civitas Lens"
                className="h-14 w-auto object-contain brightness-0 invert"
              />
            </Link>
            <p className="text-xs text-slate-300/80 leading-relaxed font-sans">
              Autonomous civic incident intelligence network. Turning field observations into validated municipal action through on-device multimodal AI and spatial correlation.
            </p>
            <div className="text-[11px] font-semibold text-[#00c49f] tracking-wide">
              People. Observations. A Safer Tomorrow.
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-xs">
            <div className="space-y-3">
              <span className="font-bold text-white uppercase tracking-wider text-[11px] block">Public Services</span>
              <ul className="space-y-2">
                <li>
                  <Link href="/report" className="hover:text-[#00c49f] transition-colors">
                    Report an Incident
                  </Link>
                </li>
                <li>
                  <Link href="/track" className="hover:text-[#00c49f] transition-colors">
                    Track Your Report
                  </Link>
                </li>
                <li>
                  <Link href="/" className="hover:text-[#00c49f] transition-colors">
                    Safety Network Overview
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <span className="font-bold text-white uppercase tracking-wider text-[11px] block">Municipal Console</span>
              <ul className="space-y-2">
                <li>
                  <Link href="/dashboard" className="hover:text-[#00c49f] transition-colors">
                    Incident Map & Clusters
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/reports" className="hover:text-[#00c49f] transition-colors">
                    Citizen Field Reports
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-[#00c49f] transition-colors">
                    Analyst Authentication
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-3 col-span-2 sm:col-span-1">
              <span className="font-bold text-white uppercase tracking-wider text-[11px] block">Standards</span>
              <ul className="space-y-2 text-slate-400">
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00c49f]"></span>
                  <span>WCAG 2.1 AA Compliant</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00c49f]"></span>
                  <span>Zero Public PII Leakage</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00c49f]"></span>
                  <span>Deterministic Guardrails</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Civitas Lens"
              className="h-6 w-auto object-contain brightness-0 invert opacity-50"
            />
            <p>© {currentYear} Civitas Lens. Official civic incident-intelligence system. All rights reserved.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-400 font-medium">Gemma 4 Intelligence Engine Online</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
