You are building "Civitas Lens", an AI incident-intelligence web app for a hackathon.
Tagline: "See Beyond the Observation. Understand the Bigger Picture."

CORE IDEA: Users submit observations (text + optional image + location + time). Gemma 4
extracts structured data, the backend retrieves candidate incidents, Gemma 4 judges
whether the new observation relates to one, and the backend VALIDATES (distance, time
window, category) before merging. Original observations are always preserved as evidence.
Gemma proposes; the backend decides and is the only writer to the database.

STACK: Next.js (App Router, TypeScript strict), Tailwind CSS, shadcn/ui, Supabase
(Postgres + PostGIS + Storage + Auth + Realtime), Zod for validation, React-Leaflet +
OpenStreetMap for maps. No FastAPI, no Python.

LLM ACCESS: Only through an OpenAI-compatible HTTP API configured by env vars
LLM_BASE_URL (default http://localhost:11434/v1), LLM_MODEL, LLM_API_KEY. Never hardcode
a provider. Local hardware is 6GB VRAM, so: max 2 LLM calls per observation, resize
images to max 896px longest side before sending, short prompts, request JSON output,
validate with Zod, retry once, then mark observation "needs_review".

AUDIO: NOT implemented now. Design the schema/types so an 'audio' modality can be added
later (nullable audio_path, modality enum includes 'audio'), but build no audio UI or code.

UI PRINCIPLES (government-portal style): simple, minimalist, trustworthy, accessible.
Light theme only. Navy primary (#1D3557-like), white surfaces, neutral grays, one muted
accent; semantic colors only for severity/status. Font: Public Sans or Inter. No gradients,
glassmorphism, heavy shadows or decorative animation. 1px borders, 8px spacing grid,
generous whitespace, clear hierarchy, large touch targets (44px), visible focus rings,
WCAG AA contrast, plain-language labels, helpful empty/loading/error states, responsive
mobile-first (citizens report from phones).

RULES: Secrets only in .env.local (provide .env.example). Service-role key server-side
only. Keep files small and typed. Put LLM prompts in /src/lib/llm/prompts. Put business
rules (distance/time/category thresholds) in one config file. After each task, run the app
and fix errors before reporting done. Don't add features I didn't ask for.