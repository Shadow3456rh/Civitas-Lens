"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { getBrowserSupabase } from "@/src/lib/supabase/client";
import { LogOut, User, Phone, Globe, Type, Menu, X } from "lucide-react";

function HeaderContent() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const isReportFlow = pathname === "/report" || pathname.startsWith("/report/");

  // Auth State
  const [userPhone, setUserPhone] = React.useState<string | null>(null);
  const [userRole, setUserRole] = React.useState<string | null>(null);

  React.useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;

    async function loadAuth() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserPhone(user.phone || null);
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();
          setUserRole(profile?.role || "citizen");
        }
      } catch (err) {
        console.warn("Header auth load notice:", err);
      }
    }

    loadAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUserPhone(session.user.phone || null);
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();
          setUserRole(profile?.role || "citizen");
        } else {
          setUserPhone(null);
          setUserRole(null);
        }
      },
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    const supabase = getBrowserSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUserPhone(null);
    setUserRole(null);
    router.push("/login");
    router.refresh();
  };

  if (isReportFlow) return null;

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200 shadow-sm flex flex-col font-sans">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-4 focus:bg-white focus:text-[#0a2540] focus:font-bold"
      >
        Skip to main content
      </a>

      {/* Utility Bar */}
      <div className="bg-[#0a2540] text-white py-1 px-4 sm:px-6 lg:px-8 text-xs font-medium">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-slate-200">
              <Globe className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="sr-only">Language options</span>
              <button className="hover:text-white focus:outline-none focus:ring-1 focus:ring-white px-1">English</button>
              <span aria-hidden="true">|</span>
              <button className="hover:text-white focus:outline-none focus:ring-1 focus:ring-white px-1">मराठी</button>
              <span aria-hidden="true">|</span>
              <button className="hover:text-white focus:outline-none focus:ring-1 focus:ring-white px-1">हिन्दी</button>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-slate-200 border-l border-slate-600 pl-4">
              <Type className="w-3.5 h-3.5" aria-hidden="true" />
              <button className="hover:text-white focus:outline-none focus:ring-1 focus:ring-white px-1 text-[10px]" aria-label="Decrease text size">A-</button>
              <button className="hover:text-white focus:outline-none focus:ring-1 focus:ring-white px-1 text-xs" aria-label="Normal text size">A</button>
              <button className="hover:text-white focus:outline-none focus:ring-1 focus:ring-white px-1 text-sm" aria-label="Increase text size">A+</button>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <a href="tel:112" className="flex items-center gap-1.5 text-red-400 font-bold hover:text-red-300 focus:outline-none focus:ring-1 focus:ring-red-400 px-1 rounded">
              <Phone className="w-3.5 h-3.5" aria-hidden="true" />
              Helpline: 112
            </a>
            <div className="border-l border-slate-600 pl-4 flex items-center">
              {userPhone ? (
                <div className="flex items-center gap-3">
                  <span className="text-slate-200 hidden sm:inline-block max-w-[120px] truncate">{userPhone}</span>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-1 text-slate-300 hover:text-white focus:outline-none focus:ring-1 focus:ring-white px-1 rounded"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign out</span>
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 text-slate-200 hover:text-white focus:outline-none focus:ring-1 focus:ring-white px-1 rounded"
                >
                  <User className="w-3.5 h-3.5" aria-hidden="true" />
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between h-24">
          <Link
            href="/"
            className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] rounded p-1 -ml-1 transition-transform"
            title="Nagpur Civic Portal - Home"
          >
            <img
              src="/logo.png"
              alt="Nagpur Civic Portal Logo"
              className="h-16 w-auto object-contain transition-transform group-hover:scale-[1.02]"
            />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2" aria-label="Main navigation">
            <Link
              href="/"
              className={cn(
                "px-3 py-2 text-base font-semibold rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316]",
                pathname === "/" ? "text-[#0a2540] bg-slate-100" : "text-slate-600 hover:text-[#0a2540] hover:bg-slate-50"
              )}
            >
              Home
            </Link>
            <Link
              href="/#how-it-works"
              className={cn(
                "px-3 py-2 text-base font-semibold rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316]",
                "text-slate-600 hover:text-[#0a2540] hover:bg-slate-50"
              )}
            >
              How it works
            </Link>
            <Link
              href="/track"
              className={cn(
                "px-3 py-2 text-base font-semibold rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316]",
                pathname === "/track" ? "text-[#0a2540] bg-slate-100" : "text-slate-600 hover:text-[#0a2540] hover:bg-slate-50"
              )}
            >
              Track a report
            </Link>
            <Link
              href="/contact"
              className={cn(
                "px-3 py-2 text-base font-semibold rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316]",
                pathname === "/contact" ? "text-[#0a2540] bg-slate-100" : "text-slate-600 hover:text-[#0a2540] hover:bg-slate-50"
              )}
            >
              Contact
            </Link>
            
            <Link
              href="/report"
              className="ml-2 inline-flex items-center justify-center px-5 py-2.5 text-base font-bold rounded bg-[#f97316] text-white hover:bg-[#ea580c] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] focus-visible:ring-offset-2"
            >
              Report an issue
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded text-slate-700 hover:text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316]"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              <span className="sr-only">Open navigation menu</span>
              {mobileMenuOpen ? (
                <X className="w-7 h-7" aria-hidden="true" />
              ) : (
                <Menu className="w-7 h-7" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-slate-50 px-4 pt-2 pb-6 space-y-1">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-3 rounded-md text-base font-medium text-slate-800 hover:bg-slate-200"
          >
            Home
          </Link>
          <Link
            href="/#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-3 rounded-md text-base font-medium text-slate-800 hover:bg-slate-200"
          >
            How it works
          </Link>
          <Link
            href="/track"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-3 rounded-md text-base font-medium text-slate-800 hover:bg-slate-200"
          >
            Track a report
          </Link>
          <Link
            href="/contact"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-3 rounded-md text-base font-medium text-slate-800 hover:bg-slate-200"
          >
            Contact
          </Link>
          <div className="pt-4 pb-2">
            <Link
              href="/report"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-center px-3 py-3 rounded bg-[#f97316] text-white font-bold text-base hover:bg-[#ea580c]"
            >
              Report an issue
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

export function Header() {
  return (
    <React.Suspense fallback={<div className="h-24 bg-white border-b border-slate-200" />}>
      <HeaderContent />
    </React.Suspense>
  );
}

