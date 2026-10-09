import Link from "next/link";
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui";

export default function HomePage() {
  return (
    <main className="flex-1">
      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200 py-16 sm:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 bg-slate-100 border border-slate-200 rounded text-xs font-semibold text-[#1d3557]">
            <span className="w-2 h-2 rounded-full bg-[#1d3557]" aria-hidden="true" />
            <span>Civitas Lens Incident Intelligence</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
            Civic Incident Intelligence &amp; Situational Awareness
          </h1>

          {/* Tagline */}
          <p className="mt-4 text-xl sm:text-2xl font-semibold text-[#1d3557] tracking-tight">
            See Beyond the Observation. Understand the Bigger Picture.
          </p>

          {/* One Short Paragraph */}
          <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-3xl leading-relaxed">
            Civitas Lens correlates citizen observations into validated, structured
            incidents in real time. Powered by on-device AI and rigorous spatial-temporal
            validation, the platform turns scattered field reports into clear, actionable
            intelligence for municipal responders and communities.
          </p>

          {/* Two Primary Actions */}
          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <Link href="/report">
              <Button size="lg" className="w-full sm:w-auto font-semibold">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Report an observation
              </Button>
            </Link>

            <Link href="/dashboard">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto font-semibold"
              >
                <svg
                  className="w-5 h-5 mr-2 text-slate-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                View incident dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 3-Step How It Works Section */}
      <section className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <div className="text-xs uppercase font-bold tracking-wider text-[#457b9d] mb-1">
              Methodology
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              How it works
            </h2>
            <p className="mt-2 text-slate-600 text-sm sm:text-base">
              A transparent 3-step pipeline designed for public safety and verified correlation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1: Observe */}
            <Card className="relative flex flex-col justify-between border-slate-200 hover:border-slate-300 transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between mb-3">
                  <span className="w-8 h-8 rounded bg-[#1d3557] text-white flex items-center justify-center font-bold text-sm">
                    1
                  </span>
                  <Badge variant="outline">Input Stage</Badge>
                </div>
                <CardTitle className="text-xl text-[#1d3557]">Observe</CardTitle>
                <CardDescription className="text-slate-600 pt-2">
                  Citizens and field personnel submit observations containing text,
                  optional captured images, precise location coordinates, and timestamps.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 space-y-1">
                  <div className="font-semibold text-slate-800">Evidence Preserved:</div>
                  <p>Raw citizen reports are recorded immutably as foundational evidence.</p>
                </div>
              </CardContent>
            </Card>

            {/* Step 2: Understand */}
            <Card className="relative flex flex-col justify-between border-slate-200 hover:border-slate-300 transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between mb-3">
                  <span className="w-8 h-8 rounded bg-[#457b9d] text-white flex items-center justify-center font-bold text-sm">
                    2
                  </span>
                  <Badge variant="outline">AI Reasoning</Badge>
                </div>
                <CardTitle className="text-xl text-[#1d3557]">Understand</CardTitle>
                <CardDescription className="text-slate-600 pt-2">
                  Gemma AI extracts structured entities, evaluates candidate matches,
                  and proposes whether new observations relate to an ongoing or emerging incident.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 space-y-1">
                  <div className="font-semibold text-slate-800">Gemma Proposes:</div>
                  <p>Entity extraction, categorization, and contextual proximity analysis.</p>
                </div>
              </CardContent>
            </Card>

            {/* Step 3: Connect */}
            <Card className="relative flex flex-col justify-between border-slate-200 hover:border-slate-300 transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between mb-3">
                  <span className="w-8 h-8 rounded bg-[#1d3557] text-white flex items-center justify-center font-bold text-sm">
                    3
                  </span>
                  <Badge variant="outline">Backend Validation</Badge>
                </div>
                <CardTitle className="text-xl text-[#1d3557]">Connect</CardTitle>
                <CardDescription className="text-slate-600 pt-2">
                  The backend validates spatial distance, time windows, and category
                  coherence before merging observations into verified incidents.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 space-y-1">
                  <div className="font-semibold text-slate-800">Backend Decides:</div>
                  <p>Guaranteed deterministic validation and single writer authority.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Design System & Semantic Token Showcase Section */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Design System Overview
            </h2>
            <p className="mt-1 text-slate-600 text-sm">
              Standardized semantic tokens, severity scales, status indicators, and UI components built to government-portal accessibility standards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Severity & Status Badges */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Severity &amp; Status Badges</CardTitle>
                <CardDescription>
                  Color-coded per accessibility contrast guidelines (WCAG AA).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Severity Levels
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge severity="low" />
                    <Badge severity="medium" />
                    <Badge severity="high" />
                    <Badge severity="critical" />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Incident Statuses
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge status="new" />
                    <Badge status="under_review" />
                    <Badge status="active" />
                    <Badge status="resolved" />
                    <Badge status="archived" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">System Alerts</CardTitle>
                <CardDescription>
                  Accessible alerts with semantic icons and clear state messaging.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Alert variant="info">
                  <AlertTitle>Spatial Verification Active</AlertTitle>
                  <AlertDescription>
                    Observations within 500 meters are automatically evaluated for potential correlation.
                  </AlertDescription>
                </Alert>

                <Alert variant="warning">
                  <AlertTitle>Review Required</AlertTitle>
                  <AlertDescription>
                    Discrepancy detected in observation time window. Marked for operator triage.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
