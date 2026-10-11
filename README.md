# Civitas Lens

### AI-Powered Municipal Incident Intelligence Platform

> **See Beyond the Observation. Understand the Bigger Picture.**

[![Next.js](https://img.shields.io/badge/Next.js-16.4_(Turbopack)-black?style=flat&logo=next.js)](https://nextjs.org/)
[![Google Gemma 4](https://img.shields.io/badge/AI_Engine-Google_Gemma_4-4285F4?style=flat&logo=google)](https://ai.google.dev/)
[![Supabase](https://img.shields.io/badge/Database-PostgreSQL_%2B_PostGIS-3ECF8E?style=flat&logo=supabase)](https://supabase.com/)
[![Leaflet](https://img.shields.io/badge/Mapping-Leaflet_%2B_OSM-199900?style=flat&logo=leaflet)](https://leafletjs.com/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS_v4-06B6D4?style=flat&logo=tailwindcss)](https://tailwindcss.com/)

---

## 1. Executive Summary

**Civitas Lens** is an AI-powered municipal situational awareness and incident intelligence platform. It bridges the critical operational gap between fragmented citizen reports and coordinated municipal response.

When civic hazards occur—such as burst water mains, cave-ins, electrical hazards, or traffic gridlocks—multiple citizens report different symptoms across divergent channels:
- One citizen uploads a photo of a flooded street.
- Another submits a text note describing traffic congestion 50 meters away.
- A third reports a ruptured municipal pipe underground.

Traditional civic ticketing systems log these as isolated, redundant tickets. **Civitas Lens uses Google Gemma 4 combined with PostGIS spatial clustering to autonomously understand, correlate, and coalesce heterogeneous observations into a single living, evidence-backed incident.**

```
   CITIZEN OBSERVATIONS                        INTELLIGENCE CORE                        MUNICIPAL ACTION
 
 [Photo of Street Flooding]  ──┐
                               │
 [Text: "Traffic Skidding"]   ──┼──► [PostGIS (500m / 24h)] ──► [Gemma 4 Semantic] ──► [Unified Incident Record]
                               │            Candidate Search        Correlation           - Live AI Summary
 [Text: "Water Main Burst"]  ──┘                                                          - 4-Stage Citizen Stepper
                                                                                          - Dispatcher Detach & Audit
```

---

## 2. Core Problem & Solution

### The Civic Problem
1. **Siloed Reports:** Incident triage desks receive dozens of complaints describing the exact same underlying event using completely different vocabularies.
2. **Missing Context:** A pothole report may appear low priority until correlated with three nearby reports of vehicle axle damage and water main erosion.
3. **Citizen Frustration:** Citizens submit complaints into a "black hole" with zero visibility into resolution progress.
4. **Dispatcher Overload:** Response teams waste critical minutes manually deduplicating complaints instead of dispatching work crews.

### The Civitas Lens Solution
- **Hybrid Intelligence:** Combines deterministic spatial boundaries (PostGIS geography within 500m & 24h) with deep semantic reasoning (Google Gemma 4) to eliminate false positives.
- **Evidence Preservation:** Raw citizen photos, original text descriptions, timestamps, and reporter contacts are never discarded—they are preserved as immutable supporting evidence.
- **Human-in-the-Loop Governance:** Municipal analysts maintain complete authority with 1-click observation detachment, re-clustering, and status management.
- **Transparent Citizen Tracking:** Every submission generates an official reference code (`CL-YYYY-XXXXXX`) allowing citizens to track progress in real-time without account friction.

---

## 3. Key Features & Capabilities

### 🏛️ Citizen Experience & Reporting
* **Interactive 3-Step Wizard (`/report`):** Clean, accessible reporting wizard with category chips, urgency selector, photo preview, and citizen contact capture.
* **In-Browser WebRTC Camera:** One-tap live camera capture via `navigator.mediaDevices.getUserMedia` with fallback to native image upload.
* **Interactive Leaflet Pin Picker:** Draggable map pin and click-to-place selector for precise geographic placement down to individual street intersections.
* **Auto Session Draft Recovery:** Form drafts persist in `sessionStorage` so unexpected browser reloads or network drops never lose citizen inputs.
* **Public Citizen Tracking Portal (`/track`):** Account-free tracking by municipal reference code (e.g. `CL-2026-000123`). Displays a read-only 4-stage resolution stepper:
  $$\text{Received} \longrightarrow \text{Under Review} \longrightarrow \text{Action in Progress} \longrightarrow \text{Resolved}$$
  Strictly zero PII is leaked on public tracking endpoints.

---

### 👁️ Computer Vision & Geolocation Intelligence
* **Dual-Strategy Geotag Verification (`/api/extract-geotag`):**
  * **Strategy 1 (EXIF / XMP Metadata):** Sub-5ms extraction of camera GPS coordinates (`latitude`, `longitude`, `altitude`) with coordinate normalization (DMS to decimal degrees, hemisphere inversion).
  * **Strategy 2 (Tesseract OCR Watermark Extractor):** Popular field-worker camera apps (such as *GPS Map Camera*) stamp coordinates and addresses visually onto the image pixels. The system automatically crops watermark bands and runs local OCR (`tesseract.js` + `eng.traineddata`) to recover stamped coordinates when EXIF metadata has been stripped.
* **Automated Reverse Geocoding (`/api/geocode`):**
  * Integrates with OpenStreetMap Nominatim with an in-memory 24-hour cache and a 1-request-per-second throttle queue, resolving raw coordinates into human-readable Indian street and locality names.

---

### 🚨 Dispatcher Operations & Incident Governance
* **Incident Intelligence Dashboard (`/dashboard`):**
  * Realtime Leaflet cluster map with severity-coded markers (`critical`, `high`, `medium`, `low`).
  * Instant multi-dimensional filtering by category, status, severity, and search keywords.
  * Realtime Supabase live-sync (`postgres_changes`) updates incident cards as new reports arrive without manual page reloads.
* **Incident Detail Console (`/dashboard/incidents/[id]`):**
  * **AI-Generated Synthesis:** Gemma 4 generates a coherent, unified incident summary that updates as new observations are attached.
  * **"Why Linked?" AI Explainability Logs:** Transparent decision accordions showing the exact spatial distance (meters), time delta, and LLM reasoning behind every correlation from `link_decisions`.
  * **Human-in-the-Loop "Detach Observation" Tool:** Analysts can split any observation that AI correlated incorrectly. Detaching instantly spins off a new standalone incident and recalculates the PostGIS centroid.
  * **Immutable Audit Trail:** Vertical event timeline (`incident_events`) logging creation, observation links, status shifts, and summary updates.
  * **Print-Ready Dispatch Sheets:** Built-in printer styling (`window.print`) for field teams and physical work orders.
* **Raw Reports Triage Desk (`/dashboard/reports` & `/dashboard/reports/[id]`):**
  * Operational inbox for managing individual citizen observations.
  * Side-by-side comparison: Citizen-selected fields vs AI-detected fields.
  * **"Needs Attention"** tab with a 1-click **"Re-run AI Analysis"** button for failed or unlinked submissions.

---

### 🧠 Resilient AI Pipeline & PostGIS Core
* **Google Gemma 4 Integration:**
  * Extraction & classification into strict JSON schemas validated via Zod.
  * Multi-observation semantic comparison with candidate incidents.
* **Deterministic Guardrails:**
  * PostGIS spatial boundary enforcement ($d \le 500\text{m}$).
  * Temporal window enforcement ($\Delta t \le 24\text{h}$).
  * Category compatibility matrix checks.
* **Offline-Tolerant Rule-Based Fallbacks (`src/lib/pipeline/process.ts`):**
  * If local Gemma 4 / Ollama is offline or under memory pressure, deterministic rule-based synthesizers automatically process observations. Submissions never fail or hang, and admin panels remain operational.
* **Automated Centroid Recalculation:**
  * PostGIS database function `recalculate_incident_centroid` dynamically computes the true spatial center (`ST_Centroid(ST_Collect(location))`) whenever observations are linked or unlinked.

---

### 🛡️ Security, Roles & Access Control
* **Supabase Authentication & Profiles:** Built-in support for roles: `citizen`, `analyst`, and `admin`.
* **Route Protection Middleware (`middleware.ts`):** Enforces access boundaries—citizens cannot access `/dashboard`, and unauthenticated users are redirected to login with return URLs.
* **Row-Level Security (RLS):** Policies protect sensitive citizen details (phone numbers, full names) while exposing verified public tracking progress.

---

## 4. System Architecture

```
                          CIVITAS LENS ARCHITECTURE
                          
       ┌────────────────────────┐         ┌────────────────────────┐
       │   Citizen Interface    │         │  Dispatcher Dashboard  │
       │  /report  |  /track    │         │  /dashboard | /reports │
       └───────────┬────────────┘         └───────────┬────────────┘
                   │                                  │
                   ▼                                  ▼
       ┌───────────────────────────────────────────────────────────┐
       │             Next.js 16 (App Router + Turbopack)           │
       │       - Server Actions & Edge Middleware Route Guards     │
       │       - Nominatim Reverse Geocoding Cache & Throttle      │
       │       - EXIF Metadata Parser & Tesseract OCR Engine       │
       └─────────────────────────────┬─────────────────────────────┘
                                     │
                                     ▼
       ┌───────────────────────────────────────────────────────────┐
       │              Incident Intelligence Engine                 │
       │               (src/lib/pipeline/process.ts)               │
       │                                                           │
       │   1. Analyze Observation (Gemma 4 / Fallback Synthesizer) │
       │   2. Candidate Retrieval (PostGIS ST_DWithin ≤ 500m)      │
       │   3. Semantic Relationship Analysis (Gemma 4 Compare)     │
       │   4. Deterministic Guardrails (Distance, Time, Category)  │
       │   5. Merge or Create Incident Record                      │
       │   6. Centroid Recalculation & Timeline Event Log          │
       └───────────────────┬───────────────────┬───────────────────┘
                           │                   │
                           ▼                   ▼
       ┌────────────────────────┐         ┌────────────────────────┐
       │    Local LLM Server    │         │   Supabase (PostgreSQL)│
       │  Google Gemma 4 (Ollama│         │  - PostGIS Extension   │
       │   or OpenAI-Compatible)│         │  - Storage Buckets     │
       │  - gemma4:e2b / e4b    │         │  - Realtime WebSocket  │
       └────────────────────────┘         │  - Row-Level Security  │
                                          └────────────────────────┘
```

---

## 5. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 16.4 (Turbopack, App Router) | Full-stack React 19 application and API routes |
| **Language** | TypeScript (Strict mode) | Type safety across client, server, and schemas |
| **Styling** | Tailwind CSS v4 | Responsive, government-grade civic interface |
| **AI Intelligence** | Google Gemma 4 (`gemma4:e2b` / `gemma4:e4b`) | Structured extraction, classification, relationship reasoning, synthesis |
| **LLM Runtime** | Ollama / OpenAI-Compatible HTTP API | Local private inference on commodity hardware |
| **Database** | PostgreSQL 15+ via Supabase | Relational data, foreign keys, triggers |
| **Geospatial Engine** | PostGIS | Spatial indexing (GiST), `ST_DWithin`, centroid calculations |
| **Realtime** | Supabase Realtime | WebSocket updates for live dispatcher dashboard |
| **Mapping** | Leaflet + OpenStreetMap | Interactive cluster maps, detail maps, location pickers |
| **Image Processing** | Sharp | Image normalization, thumbnailing, 896px max dimension scaling |
| **EXIF Parsing** | `exifr` | Camera GPS coordinates extraction (<5ms) |
| **OCR Engine** | `tesseract.js` + `eng.traineddata` | Visual timestamp and coordinate watermark extraction |
| **Validation** | Zod | Runtime schema validation of API bodies and LLM JSON outputs |
| **Icons** | Lucide React | Modern, clean vector iconography |

---

## 6. Directory Structure

```text
mvp/
├── app/
│   ├── api/
│   │   ├── extract-geotag/      # Dual-strategy EXIF & OCR extraction
│   │   ├── geocode/             # Throttled OSM Nominatim reverse geocoder
│   │   ├── incidents/           # Incident querying, updating, status changes
│   │   ├── observations/        # Observation submission & pipeline trigger
│   │   └── reports/             # Citizen report lookup & tracking API
│   ├── dashboard/
│   │   ├── incidents/[id]/      # Incident detail, AI summary, detach action, audit
│   │   ├── reports/             # Reports triage inbox & review page
│   │   └── page.tsx             # Dispatcher cluster map & live feed
│   ├── login/                   # Supabase authentication page
│   ├── report/                  # 3-step citizen reporting wizard
│   ├── track/                   # Public reference code tracking portal
│   ├── globals.css              # Global styles & municipal theme tokens
│   ├── layout.tsx               # Root layout with navigation & toast providers
│   └── page.tsx                 # Civitas Lens public landing page & hero map
├── components/
│   ├── map/                     # Leaflet cluster maps, detail map, location picker
│   ├── ui/                      # Accessible UI primitives (Button, Input, Badge, Alert)
│   └── evidence-badge.tsx       # Modality badge (photo, text, GPS verified)
├── docs/
│   ├── ADMIN_SETUP.md           # Instructions for admin user seeding
│   ├── DEMO_SCRIPT.md           # 3-minute presenter walkthrough guide
│   ├── PROJECT_CONTEXT.md       # Architectural constraints & rules
│   └── WALKTHROUGH.md           # Seeded scenario verification summary
├── public/                      # Static assets & markers
├── samples/                     # Real verification photos (e.g. water-main-break.jpg)
├── scripts/
│   ├── extract-watermark.js     # Standalone OCR GPS camera watermark script
│   ├── seed-demo.ts             # Nagpur water main crisis scenario seeder
│   ├── test-checklist.ts        # 6-point verification checklist test suite
│   ├── test-complaint-flow.ts   # Citizen complaint & tracking verification
│   ├── test-llm.ts              # Gemma 4 connection and prompt verification
│   └── test-pipeline.ts         # End-to-end observation processing test
├── src/
│   └── lib/
│       ├── llm/                 # Gemma 4 HTTP client, JSON retry, prompt templates
│       ├── pipeline/            # Incident clustering, candidate retrieval, fallbacks
│       └── supabase/            # Client, server, and middleware Supabase SDK bindings
└── supabase/
    └── migrations/              # 14 SQL migrations (PostGIS, tables, RLS, triggers)
```

---

## 7. Getting Started

### Prerequisites
- **Node.js** 20.x or higher
- **Supabase** project (free cloud tier or local Supabase CLI) with PostGIS extension enabled
- **Ollama** (or any OpenAI-compatible server) running **Google Gemma 4**:
  ```bash
  ollama pull gemma4:e2b
  # or
  ollama pull gemma4:e4b
  ```

---

### Step 1: Clone & Install Dependencies
```bash
git clone https://github.com/your-username/civitas-lens.git
cd civitas-lens/mvp
npm install
```

---

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env.local` (and `.env` for script execution):
```bash
cp .env.example .env.local
```

Configure your credentials:
```env
# Next.js Public
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Server-Only Credentials
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Gemma 4 LLM Configuration
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL=gemma4:e2b
LLM_API_KEY=ollama
```

---

### Step 3: Run Database Migrations
Run the SQL migration scripts in [`supabase/migrations`](file:///d:/Hackathons/Temp/mvp/supabase/migrations) in your Supabase SQL Editor in numerical order (or execute `00000_combined.sql` followed by `00010`–`00013`).

---

### Step 4: Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 8. Verification & Demo Scripts

The repository includes pre-built test and demo automation scripts:

| Command | Purpose |
|---|---|
| `npm run seed:demo` | Seeds the real-world **Nagpur Sitabuldi Water Main Crisis** scenario (4 correlated reports + 4 isolated decoys). |
| `npm run test:checklist` | Executes the **6-Point Verification Checklist** testing edge cases, spatial boundaries, and malformed JSON recovery. |
| `npm run test:complaint` | Validates citizen complaint submission, reference code generation, and public status tracking. |
| `npm run test:llm` | Tests live Gemma 4 connectivity, structured JSON extraction, and prompt responses. |
| `npm run test:pipeline` | Runs the full clustering pipeline with simulated observations. |

---

## 9. Live Demo Scenario: Nagpur Municipal Crisis

Civitas Lens is pre-configured with a verified municipal crisis scenario anchored at **Variety Square (Sitabuldi), Nagpur, Maharashtra, India** (`21.1458, 79.0882`):

```
                                  NAGPUR MUNICIPAL CRISIS
                                  
   Residency Road, Sadar (3.8 km North) ──► Decoy #1: Road Pothole (Isolated Incident #2)
   Civil Lines (2.5 km West)            ──► Decoy #4: Tree on Powerline (Isolated Incident #5)
   
                      ┌──────────────────────────────────────────────┐
                      │    GROUND ZERO: Sitabuldi Variety Square    │
                      │                                              │
                      │  Observation 1: Water gushing from pipe      │
                      │  Observation 2: Flooded street & skidding    │
                      │  Observation 3: Photo of burst water main    │
                      │  Observation 4: Water supply line fractured  │
                      │                                              │
                      │  ► AUTONOMOUSLY MERGED INTO INCIDENT #1      │
                      └──────────────────────────────────────────────┘
                      
   Gandhibagh (3.5 km East)             ──► Decoy #3: Garbage Dump (Isolated Incident #4)
   Medical Square, Ajni (3.2 km South)  ──► Decoy #2: Signal Blackout (Isolated Incident #3)
```

1. **4 Related Citizen Observations** submitted across a 30-minute span with divergent descriptions automatically coalesce into **Incident #1**.
2. **4 Decoy Observations** across other neighborhoods of Nagpur are strictly rejected by the PostGIS 500-meter threshold, creating safely isolated incidents.
3. Presenter walkthrough steps are fully detailed in [`docs/DEMO_SCRIPT.md`](file:///d:/Hackathons/Temp/mvp/docs/DEMO_SCRIPT.md).

---

## 10. Key Routes

| Route | Audience | Description |
|---|---|---|
| `/` | Public | Landing page with platform overview, key stats, and interactive hero map. |
| `/report` | Citizens | 3-step reporting wizard with live camera, EXIF/OCR geotag detection, and map picker. |
| `/report/submitted/[id]` | Citizens | Confirmation screen with tracking reference code and live status badge. |
| `/track` | Citizens | Public tracking portal to look up report progress by reference code without logging in. |
| `/dashboard` | Municipal Staff | Incident intelligence dashboard with real-time Leaflet map and filterable feed. |
| `/dashboard/incidents/[id]` | Municipal Staff | Deep incident console with AI summary, explainability logs, detach action, and audit trail. |
| `/dashboard/reports` | Municipal Staff | Triage desk for raw citizen reports with "Needs Attention" filter and re-run tool. |
| `/login` | Staff / Admin | Role-authenticated access control backed by Supabase Auth and Edge Middleware. |

---

## 11. Core Design Philosophy

```text
                  HUMAN OBSERVATIONS
                          │
                          ▼
                       GEMMA 4
                          │
                   AI UNDERSTANDING
                          │
                          ▼
                STRUCTURED INFORMATION
                          │
                          ▼
                RELATIONSHIP ANALYSIS
                          │
                          ▼
                  CONNECTED EVIDENCE
                          │
                          ▼
                   UNIFIED INCIDENT
                          │
                          ▼
               SITUATIONAL AWARENESS
```

> **Gemma 4 understands the unstructured human experience.**  
> **PostGIS and Civitas Lens govern, validate, connect, and present the truth.**

---

## 12. License

Civitas Lens is developed for civic good under the [MIT License](LICENSE).
Built with Google Gemma 4, Next.js, and Supabase.
