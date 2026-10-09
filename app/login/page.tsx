"use client";

/**
 * Authentication Page (/login)
 *
 * Minimal government-style Sign In and Registration for Civitas Lens.
 * Handles:
 * - Email + Password authentication via Supabase Auth
 * - Switch between "Sign In" and "Create Account"
 * - Clear notices for forbidden role redirects (/dashboard is analyst/admin only)
 * - Automatic redirect to `next` URL (defaults to /dashboard)
 */

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Alert } from "@/components/ui";
import { getBrowserSupabase } from "@/src/lib/supabase/client";
import {
  Shield,
  Lock,
  Mail,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  UserCheck,
} from "lucide-react";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextPath = searchParams.get("next") || "/dashboard";
  const errorParam = searchParams.get("error");
  const roleParam = searchParams.get("role");

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = getBrowserSupabase();

      if (mode === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          throw error;
        }

        // Fetch user profile to check role
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

        const role = profile?.role || "citizen";

        // If user is citizen and trying to enter /dashboard, inform them
        if (nextPath.startsWith("/dashboard") && role !== "analyst" && role !== "admin") {
          setErrorMessage(
            "Access Restricted: Signed in successfully as 'citizen', but /dashboard is restricted to analysts and administrators.",
          );
          setIsLoading(false);
          return;
        }

        // Redirect to intended path
        router.push(nextPath);
        router.refresh();
      } else {
        // Sign up mode
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (error) {
          throw error;
        }

        if (data.session) {
          setSuccessMessage(
            "Account created! You are registered as a 'citizen'. If you require analyst access, an administrator must promote your account.",
          );
          setTimeout(() => {
            router.push(nextPath.startsWith("/dashboard") ? "/" : nextPath);
            router.refresh();
          }, 2000);
        } else {
          setSuccessMessage(
            "Account registered. Please check your email to verify your account or sign in.",
          );
          setMode("signin");
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setErrorMessage(err.message || "Authentication failed. Please verify your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto w-full space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 mx-auto rounded-lg bg-[#1D3557] text-white flex items-center justify-center font-bold text-xl shadow-sm">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {mode === "signin" ? "Sign in to Civitas Lens" : "Create Citizen Account"}
        </h1>
        <p className="text-xs text-slate-500">
          Civic Incident Intelligence & Situational Awareness Portal
        </p>
      </div>

      {/* Forbidden Role Notice Banner */}
      {errorParam === "forbidden" && (
        <Alert variant="destructive" className="text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertTriangle className="w-4 h-4" />
            Access Restricted to Analysts & Admins
          </div>
          <p className="text-slate-700">
            You are signed in as a <strong>{roleParam || "citizen"}</strong>. The Incident Intelligence Dashboard is restricted to municipal analysts and authorized administrators.
          </p>
        </Alert>
      )}

      {/* Error or Success feedback */}
      {errorMessage && (
        <Alert variant="destructive" className="text-xs">
          {errorMessage}
        </Alert>
      )}

      {successMessage && (
        <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p>{successMessage}</p>
        </div>
      )}

      {/* Card Form */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-5">
        {/* Toggle Mode Segmented Control */}
        <div className="flex rounded-md bg-slate-100 p-1 border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setErrorMessage(null);
            }}
            className={`flex-1 py-1.5 rounded font-semibold transition-colors ${
              mode === "signin"
                ? "bg-white text-[#1D3557] shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setErrorMessage(null);
            }}
            className={`flex-1 py-1.5 rounded font-semibold transition-colors ${
              mode === "signup"
                ? "bg-white text-[#1D3557] shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="block text-xs font-semibold text-slate-700">
              Email address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.gov or name@domain.com"
                className="pl-9 text-xs h-10"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700">
                Password
              </label>
              <span className="text-[10px] text-slate-400">Min 6 characters</span>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-9 text-xs h-10"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[44px] text-xs font-bold bg-[#1D3557] hover:bg-[#162842] text-white shadow"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                {mode === "signin" ? "Signing in…" : "Creating account…"}
              </>
            ) : (
              <>{mode === "signin" ? "Sign In" : "Create Account"}</>
            )}
          </Button>
        </form>

        <div className="pt-2 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-500">
            {mode === "signin"
              ? "New users receive 'citizen' role automatically upon signup."
              : "All new accounts start as 'citizen'. Contact an administrator to request 'analyst' or 'admin' privileges."}
          </p>
        </div>
      </div>

      {/* Public reporting navigation shortcut */}
      <div className="text-center space-y-2">
        <Link
          href="/report"
          className="text-xs text-[#1D3557] hover:underline font-semibold inline-flex items-center gap-1"
        >
          Submit an observation without signing in <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-slate-50 flex items-center justify-center p-4">
      <Suspense fallback={<div className="h-48 w-full max-w-md mx-auto" />}>
        <LoginFormContent />
      </Suspense>
    </main>
  );
}
