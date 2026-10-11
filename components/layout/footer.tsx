"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function FooterContent() {
  const [currentYear, setCurrentYear] = React.useState<number | string>(2026);
  const pathname = usePathname();

  React.useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  if (pathname === "/report" || pathname.startsWith("/report/")) return null;

  return (
    <footer className="w-full bg-[#0a2540] text-slate-300 mt-auto font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-12 border-b border-slate-700">
          <div className="md:col-span-5 flex flex-col gap-4">
            <Link href="/" className="inline-block transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] rounded w-max">
              <span className="text-2xl font-bold text-white tracking-wide">Nagpur Civic Portal</span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed max-w-md">
              A prototype platform for citizens to report non-emergency civic issues and help improve our neighborhoods.
            </p>
            <div className="text-xs font-semibold text-[#f97316] tracking-wide uppercase mt-2">
              See Something Unusual? Help Connect the Dots.
            </div>
          </div>

          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
            <div className="space-y-4">
              <h2 className="font-bold text-white uppercase tracking-wider text-xs">Citizen Services</h2>
              <ul className="space-y-3">
                <li>
                  <Link href="/report" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] rounded">
                    Report an Issue
                  </Link>
                </li>
                <li>
                  <Link href="/track" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] rounded">
                    Track Your Report
                  </Link>
                </li>
                <li>
                  <Link href="/#how-it-works" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] rounded">
                    How it Works
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="font-bold text-white uppercase tracking-wider text-xs">Important Links</h2>
              <ul className="space-y-3">
                <li>
                  <Link href="/contact" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] rounded">
                    Contact & Helplines
                  </Link>
                </li>
                <li>
                  <Link href="/accessibility" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] rounded">
                    Accessibility Statement
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] rounded">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-4 col-span-2 sm:col-span-1">
              <h2 className="font-bold text-white uppercase tracking-wider text-xs">Accessibility</h2>
              <ul className="space-y-3 text-slate-400">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f97316]"></span>
                  <span>WCAG 2.1 AA Target</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f97316]"></span>
                  <span>High Contrast Support</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f97316]"></span>
                  <span>Screen Reader Friendly</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="pt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-xs text-slate-400">
          <div className="flex flex-col gap-2">
            <p>© {currentYear} Nagpur Civic Portal. All rights reserved.</p>
            <p className="max-w-xl text-slate-500">
              Prototype built for the Hacktober Fest Open Source AI Hackathon. Not an official government service.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function Footer() {
  return (
    <React.Suspense fallback={null}>
      <FooterContent />
    </React.Suspense>
  );
}
