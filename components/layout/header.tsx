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

  // Hide header on report flow for full-viewport immersive UI
  const isReportFlow = pathname === "/report" || pathname.startsWith("/report/");

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

  if (isReportFlow) return null;

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-[0_2px_15px_-3px_rgba(10,37,64,0.07)]">
      {/* Main navigation bar — taller, no top strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Civitas Lens Brand Logo — bigger to fill taller header */}
          <Link
            href="/"
            className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#028090] rounded-xl p-1 -ml-1 transition-transform active:scale-95"
            title="Civitas Lens - Home"
          >
            <img
              src="/logo.png"
              alt="Civitas Lens"
              className="h-14 w-auto object-contain transition-transform group-hover:scale-[1.02]"
            />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-2.5" aria-label="Main navigation">
            <Link
              href="/report"
              className={cn(
                "inline-flex items-center min-h-[42px] px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-sm",
                "bg-teal-gradient text-white hover:opacity-95 hover:shadow-teal-glow active:scale-95",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00a896] focus-visible:ring-offset-2",
                pathname === "/report" && "ring-2 ring-offset-2 ring-[#028090]",
              )}
            >
              <svg
                className="w-4 h-4 mr-1.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Report an Observation
            </Link>

            <Link
              href="/dashboard"
              className={cn(
                "inline-flex items-center min-h-[42px] px-3.5 py-2 text-xs font-semibold rounded-xl text-slate-700 hover:text-[#0a2540] hover:bg-slate-100/80 transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#028090] focus-visible:ring-offset-2",
                pathname.startsWith("/dashboard") && "text-[#0a2540] font-bold bg-slate-100/90 shadow-sm border border-slate-200/60",
              )}
            >
              <svg
                className="w-4 h-4 mr-1.5 text-[#028090]"
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
                "inline-flex items-center min-h-[42px] px-3.5 py-2 text-xs font-semibold rounded-xl text-slate-700 hover:text-[#0a2540] hover:bg-slate-100/80 transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#028090] focus-visible:ring-offset-2",
                pathname === "/track" && "text-[#028090] font-bold bg-[#f0fdfa] border border-[#00a896]/30 shadow-sm",
              )}
            >
              <svg
                className="w-4 h-4 mr-1.5 text-[#028090]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
              </svg>
              Track a Report
            </Link>

            <div className="h-5 w-px bg-slate-200/80 mx-1" aria-hidden="true" />

            {/* Auth Section: User & Role Badge or Sign In */}
            {userEmail ? (
              <div className="flex items-center gap-2 pl-1">
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/90 px-2.5 py-1.5 rounded-xl shadow-xs">
                  <User className="w-3.5 h-3.5 text-[#028090]" />
                  <span className="text-xs font-medium text-slate-700 max-w-[130px] truncate" title={userEmail}>
                    {userEmail}
                  </span>
                  {userRole && (
                    <span
                      className={cn(
                        "text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border font-bold",
                        getRoleBadgeClasses(userRole),
                      )}
                    >
                      {userRole}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSignOut}
                  title="Sign out"
                  className="inline-flex items-center gap-1 min-h-[36px] px-2.5 py-1 text-xs font-semibold rounded-xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">Sign out</span>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className={cn(
                  "inline-flex items-center min-h-[42px] px-4 py-2 text-xs font-bold rounded-xl text-[#0a2540] hover:text-[#028090] hover:bg-slate-50 transition-colors border border-slate-200/80",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#028090] focus-visible:ring-offset-2",
                  pathname === "/login" && "text-[#028090] bg-[#f0fdfa] border-[#00a896]/30",
                )}
              >
                Sign In
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
        <div className="md:hidden border-t border-slate-200/80 bg-white/95 backdrop-blur-md px-4 pt-3 pb-5 space-y-2.5 animate-in slide-in-from-top-2 duration-200">
          <Link
            href="/report"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-xl font-bold text-xs bg-teal-gradient text-white shadow-sm hover:shadow-teal-glow transition-all"
          >
            Report an Observation
          </Link>
          <Link
            href="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center min-h-[44px] px-3.5 py-2 rounded-xl font-medium text-xs text-slate-700 hover:text-[#0a2540] hover:bg-slate-100 transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/track"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center min-h-[44px] px-3.5 py-2 rounded-xl font-medium text-xs text-slate-700 hover:text-[#0a2540] hover:bg-slate-100 transition-colors"
          >
            Track a Report
          </Link>

          {userEmail ? (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl">
                <span className="text-xs text-slate-700 font-medium truncate max-w-[180px]">{userEmail}</span>
                {userRole && (
                  <span
                    className={cn(
                      "text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border",
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
                className="w-full flex items-center justify-center gap-1.5 min-h-[42px] px-3 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center min-h-[42px] px-3.5 py-2 rounded-xl font-bold text-xs text-[#0a2540] bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
