import Link from "next/link";
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui";
import {
  Camera,
  MapPin,
  Sparkles,
  ShieldCheck,
  Search,
  ArrowRight,
  Layers,
  Clock,
  Radio,
  FileCheck2,
  Users,
  AlertTriangle,
  Flame,
  Droplets,
  Construction,
} from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex-1 overflow-hidden">
      {/* ===================================================================
          HERO SECTION (Brand Glow, Logo Badge, Compelling Value Proposition)
         =================================================================== */}
      <section className="relative bg-white border-b border-slate-200/80 pt-16 pb-20 sm:pt-24 sm:pb-28 overflow-hidden bg-hero-glow">
        {/* Subtle decorative background circles */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] pointer-events-none opacity-40">
          <div className="absolute top-10 left-1/4 w-72 h-72 bg-[#028090]/15 rounded-full blur-3xl" />
          <div className="absolute top-20 right-1/4 w-96 h-96 bg-[#00a896]/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Official Emblem Banner */}
          <div className="inline-flex items-center gap-2.5 mb-6 px-3.5 py-1.5 bg-[#f0fdfa] border border-[#00a896]/30 rounded-full text-xs font-semibold text-[#0a2540] shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00a896] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00c49f]"></span>
            </span>
            <span>Civitas Lens Municipal Incident Intelligence</span>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span className="hidden sm:inline text-slate-500 font-normal">Real-Time Spatial Clustering</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[#0a2540] leading-[1.15]">
            From Citizen Observations to{" "}
            <span className="text-brand-gradient">Coordinated Civic Action.</span>
          </h1>

          {/* Tagline from Official Logo */}
          <p className="mt-4 text-xl sm:text-2xl font-bold text-[#028090] tracking-tight">
            People. Observations. A Safer Tomorrow.
          </p>

          {/* Value Proposition Copy */}
          <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed font-sans">
            Civitas Lens autonomously correlates scattered citizen field reports, photos, and GPS pins into verified, structured incident intelligence. Powered by multimodal AI and spatial guardrails—zero duplicate tickets, zero responder delays.
          </p>

          {/* Action CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/report" className="w-full sm:w-auto">
              <Button
                variant="teal"
                size="lg"
                className="w-full sm:w-auto px-7 py-3.5 text-sm font-bold shadow-teal-glow transition-all active:scale-95"
              >
                <Camera className="w-4 h-4 mr-2" />
                Report an Incident
              </Button>
            </Link>

            <Link href="/track" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto px-6 py-3.5 text-sm font-semibold border-slate-300 text-slate-800 hover:border-[#028090] hover:text-[#0a2540] transition-all"
              >
                <Search className="w-4 h-4 mr-2 text-[#028090]" />
                Track Your Report
              </Button>
            </Link>

            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button
                variant="ghost"
                size="lg"
                className="w-full sm:w-auto px-5 py-3.5 text-sm font-semibold text-slate-600 hover:text-[#0a2540] hover:bg-slate-100/80"
              >
                Analyst Portal <ArrowRight className="w-4 h-4 ml-1.5 text-slate-400" />
              </Button>
            </Link>
          </div>

          {/* Live System Telemetry Strip */}
          <div className="mt-14 pt-8 border-t border-slate-200/70 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/60 text-left">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                <Clock className="w-3.5 h-3.5 text-[#028090]" />
                Triage Speed
              </div>
              <div className="text-2xl font-black text-[#0a2540]">&lt; 30s</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Automated AI assessment</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/60 text-left">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                <MapPin className="w-3.5 h-3.5 text-[#00a896]" />
                Spatial Radius
              </div>
              <div className="text-2xl font-black text-[#0a2540]">500 m</div>
              <div className="text-[11px] text-slate-500 mt-0.5">PostGIS spatial clustering</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/60 text-left">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Intelligence
              </div>
              <div className="text-2xl font-black text-[#0a2540]">Gemma 4</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Multimodal scene analysis</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/60 text-left">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Citizen Privacy
              </div>
              <div className="text-2xl font-black text-[#0a2540]">100%</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Zero public PII leakage</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          HOW IT WORKS (The 3 Pillars of Civitas Lens)
         =================================================================== */}
      <section className="py-20 bg-slate-50/70 border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-16">
            <span className="text-xs uppercase font-extrabold tracking-wider text-[#028090] bg-[#f0fdfa] border border-[#00a896]/20 px-3 py-1 rounded-full">
              Intelligent Pipeline
            </span>
            <h2 className="mt-3 text-3xl font-extrabold text-[#0a2540] tracking-tight">
              How Civitas Lens Solves Duplicate Chaos
            </h2>
            <p className="mt-2 text-slate-600 text-sm sm:text-base">
              From raw mobile phone photos to synthesized municipal incident commands in 3 transparent stages.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Stage 1 */}
            <Card className="relative bg-white border-slate-200/90 hover:border-[#028090]/40 transition-all flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#0a2540] text-white flex items-center justify-center font-bold text-base shadow-sm">
                    1
                  </div>
                  <Badge variant="outline" className="text-xs bg-slate-50 font-semibold text-slate-700">
                    Input Capture
                  </Badge>
                </div>
                <CardTitle className="text-xl text-[#0a2540]">Field Capture</CardTitle>
                <CardDescription className="text-slate-600 pt-2 text-sm leading-relaxed">
                  Citizens submit photos and complaints in seconds. GPS coordinates, accuracy meters, timestamps, and camera metadata attach automatically.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-3 bg-[#f8fafc] rounded-xl border border-slate-200/70 text-xs text-slate-600 space-y-1.5">
                  <div className="font-bold text-[#0a2540] flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-[#028090]" />
                    Evidence Preserved
                  </div>
                  <p>Raw photos and original complaints are stored immutably as evidentiary truth.</p>
                </div>
              </CardContent>
            </Card>

            {/* Stage 2 */}
            <Card className="relative bg-white border-slate-200/90 hover:border-[#028090]/40 transition-all flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-teal-gradient text-white flex items-center justify-center font-bold text-base shadow-sm">
                    2
                  </div>
                  <Badge variant="outline" className="text-xs bg-[#f0fdfa] text-[#028090] border-[#00a896]/30 font-semibold">
                    Multimodal AI
                  </Badge>
                </div>
                <CardTitle className="text-xl text-[#0a2540]">Gemma 4 Synthesis</CardTitle>
                <CardDescription className="text-slate-600 pt-2 text-sm leading-relaxed">
                  On-device multimodal intelligence extracts hazards, verifies physical objects, identifies damage, and checks candidate matches against existing incidents.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-3 bg-[#f0fdfa] rounded-xl border border-[#00a896]/20 text-xs text-slate-700 space-y-1.5">
                  <div className="font-bold text-[#028090] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#00a896]" />
                    AI Reasoning
                  </div>
                  <p>Evaluates whether multiple distinct perspectives describe the same real-world event.</p>
                </div>
              </CardContent>
            </Card>

            {/* Stage 3 */}
            <Card className="relative bg-white border-slate-200/90 hover:border-[#028090]/40 transition-all flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#028090] text-white flex items-center justify-center font-bold text-base shadow-sm">
                    3
                  </div>
                  <Badge variant="outline" className="text-xs bg-slate-50 font-semibold text-slate-700">
                    Spatial Guardrails
                  </Badge>
                </div>
                <CardTitle className="text-xl text-[#0a2540]">Verified Clustering</CardTitle>
                <CardDescription className="text-slate-600 pt-2 text-sm leading-relaxed">
                  Strict PostGIS distance (&le; 500m), temporal window (&le; 24h), and category matrix ensure reports only merge if both AI reasoning and mathematical guardrails agree.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-3 bg-[#f8fafc] rounded-xl border border-slate-200/70 text-xs text-slate-600 space-y-1.5">
                  <div className="font-bold text-[#0a2540] flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Human-in-the-Loop
                  </div>
                  <p>Full explainability logs with single-click operator detach or reassign actions.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ===================================================================
          MUNICIPAL CATEGORIES CAROUSEL / HIGHLIGHTS
         =================================================================== */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
            <div>
              <span className="text-xs uppercase font-extrabold tracking-wider text-[#028090]">
                City Domains
              </span>
              <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-[#0a2540] tracking-tight">
                Covering Critical Urban Infrastructure
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm">
              Standardized taxonomy enabling instant routing to public works, emergency services, and water management.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-[#028090]/40 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#0a2540] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Droplets className="w-5 h-5 text-[#028090]" />
              </div>
              <h3 className="text-sm font-bold text-[#0a2540]">Water &amp; Drainage</h3>
              <p className="text-xs text-slate-500 mt-1">Pipe bursts, sewer backflow, flooding, stormwater drain blockages.</p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-[#028090]/40 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-[#0a2540] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Construction className="w-5 h-5 text-amber-700" />
              </div>
              <h3 className="text-sm font-bold text-[#0a2540]">Roads &amp; Potholes</h3>
              <p className="text-xs text-slate-500 mt-1">Asphalt cave-ins, dangerous trenches, damaged dividers, missing grates.</p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-[#028090]/40 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-[#0a2540] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="text-sm font-bold text-[#0a2540]">Public Safety</h3>
              <p className="text-xs text-slate-500 mt-1">Downed power lines, traffic signal failures, structural hazards, collisions.</p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-[#028090]/40 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#0a2540] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 text-emerald-700" />
              </div>
              <h3 className="text-sm font-bold text-[#0a2540]">Environment</h3>
              <p className="text-xs text-slate-500 mt-1">Illegal dumping, fallen trees, hazardous spills, industrial smoke.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          BOTTOM CALL TO ACTION (Brand Gradient Banner)
         =================================================================== */}
      <section className="bg-brand-gradient text-white py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-block p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 mb-2">
            <img
              src="/logo.png"
              alt="Civitas Lens"
              className="h-10 w-auto object-contain brightness-0 invert mx-auto"
            />
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            See Beyond the Observation. Understand the Bigger Picture.
          </h2>

          <p className="text-slate-200 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Help build a safer, more responsive municipality. Capture an observation right now or track the progress of an existing community issue.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/report" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto px-8 py-3.5 bg-white text-[#0a2540] hover:bg-slate-100 font-bold shadow-lg transition-transform active:scale-95"
              >
                <Camera className="w-4 h-4 mr-2 text-[#028090]" />
                Submit New Report
              </Button>
            </Link>

            <Link href="/track" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto px-7 py-3.5 bg-transparent border border-white/40 text-white hover:bg-white/15 font-semibold transition-colors"
              >
                <Search className="w-4 h-4 mr-2 text-[#00c49f]" />
                Track Status by Code
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
