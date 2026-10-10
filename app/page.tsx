"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui";
import { 
  Camera, Search, ArrowRight, Shield, Activity, 
  MapPin, CheckCircle, Clock, Zap, Target
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { getBrowserSupabase } from "@/src/lib/supabase/client";

// Dynamically import the Leaflet map component to prevent SSR issues
const HeroMap = dynamic(() => import("@/components/map/hero-map"), { ssr: false });

export default function HomePage() {
  const [recentReports, setRecentReports] = useState<any[]>([]);

  useEffect(() => {
    async function fetchRecent() {
      const supabase = getBrowserSupabase();
      if (!supabase) return;
      const { data } = await supabase
        .from("reports")
        .select("id, category, created_at, location")
        .eq("status", "resolved")
        .order("created_at", { ascending: false })
        .limit(3);
      
      if (data) setRecentReports(data);
    }
    fetchRecent();
  }, []);

  return (
    <main id="main-content" className="flex-1 bg-white font-sans overflow-x-hidden">
      
      {/* ===================================================================
          HERO SECTION
         =================================================================== */}
      <section className="relative pt-12 pb-20 sm:pt-16 sm:pb-24 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Copy & Actions */}
            <div className="max-w-2xl">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0a2540] leading-tight tracking-tight">
                See Something Unusual? <br className="hidden sm:block" />
                <span className="text-[#00a896]">Help Connect the Dots.</span>
              </h1>
              
              <p className="mt-6 text-lg text-slate-600 leading-relaxed font-medium">
                Your community relies on active citizens. Report non-emergency civic issues in seconds. Our system automatically clusters reports to help authorities act faster.
              </p>
              
              <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
                <Link href="/report" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto px-8 py-6 text-base font-bold bg-[#00a896] hover:bg-[#028090] text-white rounded-lg shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00a896]"
                  >
                    <Camera className="w-5 h-5 mr-2" />
                    Submit a report
                  </Button>
                </Link>
                <Link href="/track" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto px-8 py-6 text-base font-bold border-2 border-slate-300 text-[#0a2540] hover:border-[#0a2540] hover:bg-slate-50 rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0a2540]"
                  >
                    <Search className="w-5 h-5 mr-2" />
                    Track a report
                  </Button>
                </Link>
              </div>

              <div className="mt-8 flex items-center gap-2 text-sm font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-4 py-2 rounded max-w-max">
                <Shield className="w-4 h-4 text-[#00a896]" />
                Your observation matters. Your privacy matters too.
              </div>
            </div>

            {/* Right Column: Visual Map */}
            <div className="relative h-[400px] lg:h-[500px] w-full rounded-2xl shadow-sm border-2 border-slate-200/60 overflow-hidden bg-slate-50">
              <HeroMap />
              <div className="absolute bottom-4 left-4 z-[500] bg-white/95 backdrop-blur px-3 py-1.5 rounded border border-slate-200 shadow-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#00a896]" />
                <span className="text-xs font-bold text-slate-700">Live: 142 Reports in the last 24 hours</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          CATEGORY GRID
         =================================================================== */}
      <section className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-[#0a2540] tracking-tight">What have you observed?</h2>
            <p className="mt-3 text-slate-600 text-lg">Select a category below to start a new report.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
            {[
              { label: "Roads & Potholes", icon: "🚧", desc: "Damaged surfaces, sinkholes", link: "/report" },
              { label: "Water & Drainage", icon: "💧", desc: "Leaks, flooding, blocked drains", link: "/report" },
              { label: "Garbage & Waste", icon: "🗑️", desc: "Illegal dumping, missed collections", link: "/report" },
              { label: "Streetlights", icon: "💡", desc: "Broken lights, exposed wires", link: "/report" },
              { label: "Safety Hazards", icon: "⚠️", desc: "Dangerous structures, spills", link: "/report" },
              { label: "Environment", icon: "🌳", desc: "Fallen trees, pollution", link: "/report" },
            ].map((cat, idx) => (
              <Link 
                key={idx} 
                href={cat.link}
                className="group flex flex-col items-center text-center p-6 bg-white border-2 border-slate-200 rounded-xl hover:border-[#00a896] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00a896] transition-all"
              >
                <div className="w-14 h-14 bg-slate-100 group-hover:bg-[#f0fdfa] rounded-full flex items-center justify-center text-2xl mb-4 transition-colors">
                  {cat.icon}
                </div>
                <h3 className="font-bold text-[#0a2540] text-lg mb-1">{cat.label}</h3>
                <p className="text-sm text-slate-500">{cat.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===================================================================
          HOW IT WORKS (4 STEPS)
         =================================================================== */}
      <section id="how-it-works" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-[#0a2540] tracking-tight">How it works</h2>
            <p className="mt-3 text-slate-600 text-lg font-semibold">Connected by AI, reviewed by people.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { step: "1", title: "You Observe", desc: "Spot an issue in your neighborhood and snap a quick photo with your phone.", icon: <Camera className="w-6 h-6" /> },
              { step: "2", title: "AI Synthesis", desc: "Our system automatically extracts location and groups similar reports together.", icon: <Zap className="w-6 h-6" /> },
              { step: "3", title: "City Review", desc: "Municipal analysts review the clustered data to prioritize and assign work orders.", icon: <Target className="w-6 h-6" /> },
              { step: "4", title: "Resolution", desc: "Track the progress online until the issue is officially resolved by the city.", icon: <CheckCircle className="w-6 h-6" /> }
            ].map((item, idx) => (
              <div key={idx} className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-[#0a2540] text-white rounded-full flex items-center justify-center mb-6 shadow-md border-4 border-slate-50 relative">
                  {item.icon}
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#00a896] text-white font-bold text-xs rounded-full flex items-center justify-center border-2 border-white">
                    {item.step}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-[#0a2540] mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================================================================
          RECENTLY RESOLVED NOTICE BOARD
         =================================================================== */}
      {recentReports.length > 0 && (
        <section className="py-12 bg-slate-50 border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle className="w-6 h-6 text-[#00a896]" />
              <h2 className="text-xl font-bold text-[#0a2540]">Recently Resolved</h2>
            </div>
            
            <div className="flex flex-col gap-3">
              {recentReports.map((report) => (
                <div key={report.id} className="bg-white border border-slate-200 rounded p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#f0fdfa] text-[#00a896] p-2 rounded">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#0a2540] text-sm capitalize">{report.category?.replace(/_/g, " ") || "Issue"}</h4>
                      <p className="text-xs text-slate-500">Report #{report.id.substring(0, 8).toUpperCase()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded">
                    <Clock className="w-3.5 h-3.5" />
                    Resolved {new Date(report.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===================================================================
          EMERGENCY CTA BOX
         =================================================================== */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="border-2 border-red-200 bg-red-50 p-8 rounded-xl">
            <h2 className="text-2xl font-bold text-red-700 mb-2">Need Immediate Emergency Assistance?</h2>
            <p className="text-red-600/80 mb-6">This platform is for non-emergency civic issues only. For fire, crime, or medical emergencies, please call the national helpline immediately.</p>
            <a href="tel:112" className="inline-flex items-center justify-center px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2">
              Call 112 Now
            </a>
          </div>
        </div>
      </section>

    </main>
  );
}
