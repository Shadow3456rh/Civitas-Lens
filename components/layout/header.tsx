"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { getBrowserSupabase } from "@/src/lib/supabase/client";
import { LogOut, User, Shield, AlertCircle } from "lucide-react";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Auth State
  const [userEmail, setUserEmail] = React.useState<string | null>(null);
  const [userRole, setUserRole] = React.useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = React.useState(true);

  React.useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setIsAuthLoading(false);
      return;
    }

    // 1. Fetch current session and role
    async function loadAuth() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserEmail(user.email || null);
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

          setUserRole(profile?.role || "citizen");
        } else {
          setUserEmail(null);
          setUserRole(null);
        }
      } catch (err) {
        console.warn("Header auth load notice:", err);
      } finally {
        setIsAuthLoading(false);
      }
    }

    loadAuth();

    // 2. Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUserEmail(session.user.email || null);
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();
          setUserRole(profile?.role || "citizen");
        } else {
          setUserEmail(null);
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
    setUserEmail(null);
    setUserRole(null);
    router.push("/login");
    router.refresh();
  };

  const getRoleBadgeClasses = (role: string | null) => {
    switch (role) {
      case "admin":
        return "bg-rose-100 text-rose-900 border-rose-300 font-bold";
      case "analyst":
        return "bg-indigo-100 text-indigo-900 border-indigo-300 font-semibold";
      default:
        return "bg-slate-100 text-slate-800 border-slate-300 font-medium";
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200">
      {/* Slim official top strip */}
      <div className="bg-[#1d3557] text-white text-[11px] font-medium tracking-wide px-4 py-1 flex items-center justify-between">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Civic Incident Intelligence Portal • Real-Time Correlation Active</span>
          </div>

          <div className="flex items-center gap-3">
            {userRole && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-slate-200">
                <span>Account Role:</span>
                <span className="font-bold text-white uppercase tracking-wider text-[10px] bg-white/20 px-1.5 py-0.5 rounded border border-white/30">
                  {userRole}
                </span>
              </span>
            )}
            <span className="hidden sm:inline text-slate-300">Official Portal Standard</span>
          </div>
        </div>
      </div>

      {/* Main slim navigation bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Civitas Lens Wordmark */}
          <Link
            href="/"
            className="flex items-center gap-2.5 text-[#1d3557] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d3557] focus-visible:ring-offset-2 rounded p-1 -ml-1"
          >
            <div className="w-8 h-8 rounded bg-[#1d3557] text-white flex items-center justify-center font-bold text-base shadow-sm group-hover:bg-[#162842] transition-colors">
              <svg
                className="w-5 h-5 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="8" />
                <line x1="12" y1="2" x2="12" y2="4" />
                <line x1="12" y1="20" x2="12" y2="22" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight leading-none text-[#1d3557]">
                Civitas Lens
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-500 leading-tight">
                Incident Intelligence
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-2" aria-label="Main navigation">
            <Link
              href="/report"
              className={cn(
                "inline-flex items-center min-h-[44px] px-3.5 py-2 text-sm font-semibold rounded transition-colors",
                "bg-[#1d3557] text-white hover:bg-[#162842] active:bg-[#0f1d30]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d3557] focus-visible:ring-offset-2",
                pathname === "/report" && "ring-2 ring-offset-2 ring-[#1d3557]",
              )}
            >
              <svg
                className="w-4 h-4 mr-1.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Report an observation
            </Link>

            <Link
              href="/dashboard"
              className={cn(
                "inline-flex items-center min-h-[44px] px-3 py-2 text-sm font-medium rounded text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d3557] focus-visible:ring-offset-2",
                pathname.startsWith("/dashboard") && "text-[#1d3557] font-semibold bg-slate-100",
              )}
            >
              <svg
                className="w-4 h-4 mr-1.5 text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                />
              </svg>
              Dashboard
            </Link>

            <Link
              href="/track"
              className={cn(
                "inline-flex items-center min-h-[44px] px-3 py-2 text-sm font-medium rounded text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d3557] focus-visible:ring-offset-2",
                pathname === "/track" && "text-[#1d3557] font-semibold bg-slate-100",
              )}
            >
              Track a report
            </Link>

            <div className="h-6 w-px bg-slate-200 mx-1" aria-hidden="true" />

            {/* Auth Section: User & Role Badge or Sign In */}
            {userEmail ? (
              <div className="flex items-center gap-2 pl-1">
                {/* User email & Role badge */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs text-slate-700 max-w-[140px] truncate" title={userEmail}>
                    {userEmail}
                  </span>
                  {userRole && (
                    <span
                      className={cn(
                        "text-[10px] uppercase tracking-wide px-1.5 py-0.2 rounded border",
                        getRoleBadgeClasses(userRole),
                      )}
                    >
                      {userRole}
                    </span>
                  )}
                </div>

                {/* Sign Out Button */}
                <button
                  type="button"
                  onClick={handleSignOut}
                  title="Sign out"
                  className="inline-flex items-center gap-1 min-h-[38px] px-2.5 py-1 text-xs font-semibold rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className={cn(
                  "inline-flex items-center min-h-[44px] px-3 py-2 text-sm font-medium rounded text-slate-700 hover:text-[#1d3557] hover:bg-slate-50 transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d3557] focus-visible:ring-offset-2",
                  pathname === "/login" && "text-[#1d3557] font-semibold bg-slate-100",
                )}
              >
                Sign in
              </Link>
            )}
          </nav>

          {/* Mobile Menu Button (min 44x44px touch target) */}
          <div className="flex md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] p-2 rounded text-slate-700 hover:text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d3557]"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              <span className="sr-only">Open navigation menu</span>
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-2">
          <Link
            href="/report"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center min-h-[44px] px-3 py-2.5 rounded font-semibold text-sm bg-[#1d3557] text-white"
          >
            Report an observation
          </Link>
          <Link
            href="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center min-h-[44px] px-3 py-2.5 rounded font-medium text-sm text-slate-700 hover:bg-slate-100"
          >
            Dashboard
          </Link>
          <Link
            href="/track"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center min-h-[44px] px-3 py-2.5 rounded font-medium text-sm text-slate-700 hover:bg-slate-100"
          >
            Track a report
          </Link>

          {userEmail ? (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between px-3 py-1 bg-slate-50 rounded">
                <span className="text-xs text-slate-600 truncate">{userEmail}</span>
                {userRole && (
                  <span
                    className={cn(
                      "text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border",
                      getRoleBadgeClasses(userRole),
                    )}
                  >
                    {userRole}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleSignOut();
                }}
                className="w-full flex items-center justify-center gap-1.5 min-h-[44px] px-3 py-2 rounded text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center min-h-[44px] px-3 py-2.5 rounded font-medium text-sm text-slate-700 hover:bg-slate-100"
            >
              Sign in
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
