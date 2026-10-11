"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Alert } from "@/components/ui";
import { getBrowserSupabase } from "@/src/lib/supabase/client";
import {
  Shield,
  Phone,
  User as UserIcon,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  KeyRound,
} from "lucide-react";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextPath = searchParams.get("next") || "/";
  const errorParam = searchParams.get("error");
  const roleParam = searchParams.get("role");

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"request" | "verify">("request");
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!phone) {
      setErrorMessage("Please enter your phone number.");
      return;
    }

    if (mode === "signup" && !fullName.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }

    setIsLoading(true);
    try {
      const supabase = getBrowserSupabase();
      
      const { error } = await supabase.auth.signInWithOtp({
        phone: phone.trim(),
        options: {
          data: mode === "signup" ? { full_name: fullName.trim() } : undefined
        }
      });

      if (error) throw error;

      setSuccessMessage("Verification code sent via SMS.");
      setStep("verify");
    } catch (err: any) {
      console.error("Auth error:", err);
      setErrorMessage(err.message || "Failed to send verification code. Please check your number.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!otp) {
      setErrorMessage("Please enter the verification code.");
      return;
    }

    setIsLoading(true);
    try {
      const supabase = getBrowserSupabase();

      const { data, error } = await supabase.auth.verifyOtp({
        phone: phone.trim(),
        token: otp.trim(),
        type: 'sms',
      });

      if (error) throw error;

      // Fetch user profile to check role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user?.id)
        .single();

      const role = profile?.role || "citizen";



      router.push(nextPath);
      router.refresh();
    } catch (err: any) {
      console.error("Verification error:", err);
      setErrorMessage(err.message || "Invalid or expired verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto w-full space-y-6">
      <div className="text-center space-y-3">
        <Link href="/" className="inline-block transition-transform hover:scale-105">
          <img src="/logo.png" alt="Civitas Lens" className="h-14 w-auto mx-auto object-contain drop-shadow-xs" />
        </Link>
        <div className="space-y-1">
          <h1 className="text-xl font-extrabold tracking-tight text-[#0a2540]">
            {mode === "signin" ? "Sign In to Civitas Lens" : "Create Citizen Account"}
          </h1>
          <p className="text-xs text-slate-500 font-medium">People. Observations. A Safer Tomorrow.</p>
        </div>
      </div>



      {errorMessage && <Alert variant="destructive" className="text-xs rounded-xl">{errorMessage}</Alert>}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p>{successMessage}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm space-y-5">
        {step === "request" ? (
          <>
            <div className="flex rounded-xl bg-slate-100/80 p-1 border border-slate-200/90 text-xs">
              <button
                type="button"
                onClick={() => { setMode("signin"); setErrorMessage(null); }}
                className={`flex-1 py-2 rounded-lg font-bold transition-all cursor-pointer ${mode === "signin" ? "bg-white text-[#0a2540] shadow-xs" : "text-slate-500 hover:text-slate-900"}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode("signup"); setErrorMessage(null); }}
                className={`flex-1 py-2 rounded-lg font-bold transition-all cursor-pointer ${mode === "signup" ? "bg-white text-[#0a2540] shadow-xs" : "text-slate-500 hover:text-slate-900"}`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleRequestOtp} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-1">
                  <label htmlFor="fullName" className="block text-xs font-semibold text-slate-700">Full Name</label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      id="fullName"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Rahul Verma"
                      className="pl-9 text-xs h-10 rounded-xl border-slate-200 focus:border-[#ea580c] focus:ring-[#f97316]/20"
                    />
                  </div>
                </div>
              )}
              
              <div className="space-y-1">
                <label htmlFor="phone" className="block text-xs font-semibold text-slate-700">Phone Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    id="phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1234567890"
                    className="pl-9 text-xs h-10 rounded-xl border-slate-200 focus:border-[#ea580c] focus:ring-[#f97316]/20"
                  />
                </div>
                <p className="text-[10px] text-slate-500 pt-1">Include country code (e.g., +1)</p>
              </div>

              <Button type="submit" variant="teal" disabled={isLoading} className="w-full min-h-[46px] text-xs font-bold shadow-orange-glow text-white rounded-xl">
                {isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                Send Verification Code
              </Button>
            </form>
          </>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="otp" className="block text-xs font-semibold text-slate-700">Verification Code</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  id="otp"
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  className="pl-9 text-xs h-10 rounded-xl border-slate-200 focus:border-[#ea580c] focus:ring-[#f97316]/20 text-center tracking-widest font-mono"
                  maxLength={6}
                />
              </div>
            </div>
            
            <Button type="submit" variant="teal" disabled={isLoading} className="w-full min-h-[46px] text-xs font-bold shadow-orange-glow text-white rounded-xl">
              {isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
              Verify and Sign In
            </Button>

            <div className="pt-2 text-center">
              <button 
                type="button" 
                onClick={() => { setStep("request"); setOtp(""); setSuccessMessage(null); }}
                className="text-[11px] text-[#ea580c] hover:underline"
              >
                Use a different phone number
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="text-center space-y-2">
        <Link href="/report" className="text-xs text-[#ea580c] hover:text-[#f97316] font-bold inline-flex items-center gap-1 transition-colors">
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
