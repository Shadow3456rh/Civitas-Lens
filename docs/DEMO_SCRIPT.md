# Civitas Lens — 3-Minute Live Demo Script

> **Scenario**: Real-world municipal crisis scenario in **Nagpur, India**. A major underground water supply conduit fractures near **Variety Square (Sitabuldi)**, causing street flooding, vehicle stranding, and traffic disruption. Four different citizens report the event with completely different phrasing, angles, and modalities (including live photographic evidence). Four unrelated decoy reports across Nagpur (Sadar, Medical Square, Gandhibagh, Civil Lines) test system boundaries.

---

## Demo Timing & Walkthrough Summary

| Time | Segment | URL / Screen | Key Talking Point |
| :--- | :--- | :--- | :--- |
| **0:00 – 0:30** | **The Hook & Problem** | `/` (Home) | Municipalities drown in duplicate, fragmented complaints. Civitas Lens autonomously correlates multi-source citizen evidence using Google Gemma 4. |
| **0:30 – 1:15** | **Citizen One-Tap Capture** | `/report` | Frictionless GPS Map Camera interface: hardware geolocation, live timestamp, instant camera evidence submission without login barriers. |
| **1:15 – 2:00** | **Analyst Incident Dashboard** | `/dashboard` | Real-time map & filterable feed. 4 independent reports converged into **Incident #1**, while distant decoys stay isolated. |
| **2:00 – 2:35** | **AI Intelligence & Explainability** | `/dashboard/incidents/[id]` | Gemma 4 synthesized summary, signed photographic evidence, and the transparent **"Why linked?"** audit drawer. |
| **2:35 – 3:00** | **Human-in-the-Loop Governance** | Status changer & Detach button | Municipal workflow status lifecycle, immutable event timeline, and one-click false-merge override. |

---

## Detailed Step-by-Step Click Path

### Phase 1: The Problem & The Vision (0:00 – 0:30)
1. **Open**: `http://localhost:3000`
2. **Narration**:
   > *"When a city infrastructure crisis strikes—like a burst water main—dozens of citizens submit panicked reports across 311 helplines, WhatsApp, and social media. City operators end up with duplicate tickets, contradictory descriptions, and zero situational awareness.*
   > *Civitas Lens solves this with an edge-to-decision pipeline. By pairing local Google Gemma 4 multimodal intelligence with strict PostGIS spatial and temporal guardrails, it turns citizen noise into verified municipal intelligence."*
3. **Action**: Click the navy **"Report an observation"** button.

---

### Phase 2: Frictionless Citizen Reporting (0:30 – 1:15)
1. **Screen**: `http://localhost:3000/report`
2. **Point to**:
   - **One-Tap GPS Map Camera Experience**: Note the live telemetry strip at the top:
     - Hardware GPS coordinates: `21.1458, 79.0882`
     - GPS Accuracy badge: `GPS ±6 m`
     - Automatic captured timestamp
     - Reverse-geocoded landmark: *"Variety Square, Sitabuldi, Nagpur"*
   - **Zero Login Friction**: Any citizen can submit immediately without creating an account or downloading heavy mobile apps.
3. **Action**:
   - Select or capture evidence (demonstrating photo upload or text description: *"Water gushing on the road near Variety Square signal, traffic halted"*).
   - Click **"Submit Observation"**.
   - Show the instant submission confirmation: Submissions receive an immediate 200 OK and UUID, with heavyweight Gemma multimodal analysis and spatial correlation executed in the background.
4. **Action**: Click **"Dashboard"** in the top navigation bar.

---

### Phase 3: The Real-Time Analyst Dashboard (1:15 – 2:00)
1. **Screen**: `http://localhost:3000/dashboard`
2. **Point to**:
   - **Dual-Pane Operations View**:
     - **Left**: Live filterable incident list with severity badges (`Critical`, `High`, `Medium`, `Low`) and status tags.
     - **Right**: Leaflet satellite/street map centered on Nagpur with clustered incident markers.
   - **Real-Time Supabase Subscription**: New observations stream onto the map and list without page refreshes.
   - **The Correlation Magic**:
     - Highlight **Incident #1**: Notice the badge showing **`4 observations`**.
     - Explain: *"Four different citizens—one who said 'water gushing on the road', one who complained of 'vehicles skidding near Variety Chowk', one who photographed the submerged roadway, and one shopkeeper who reported a 'burst supply pipe'—were autonomously coalesced into this single incident."*
   - **Guardrail Demonstration (Decoy Segregation)**:
     - Point out the other incidents on the map:
       - *Sadar* (3.8 km north - Pothole cave-in)
       - *Medical Square* (3.2 km south - Traffic light outage)
       - *Gandhibagh* (3.5 km east - Garbage overflow)
       - *Civil Lines* (2.5 km west - Downed tree branch)
     - Explain: *"Our backend enforces a 500-meter PostGIS spatial boundary and 24-hour temporal window. Even if Gemma thought two events sounded similar, strict spatial rules prevent false merges across the city."*
3. **Action**: Click on the **Variety Square** incident card to drill down into the incident intelligence file.

---

### Phase 4: Incident Intelligence & Transparent AI (2:00 – 2:35)
1. **Screen**: `http://localhost:3000/dashboard/incidents/[incident_id]`
2. **Point to**:
   - **Executive Header**: Severity `CRITICAL`, Status `NEW`, category `Infrastructure`, coordinates (`21.1458, 79.0882`).
   - **AI-Synthesized Summary Card**:
     - Labeled explicitly as **`AI-generated summary`** with Gemma 4 model provenance.
     - Notice how it synthesizes evidence across all 4 reports: identifies the ruptured underground water main, water pressure levels, road flooding, and impact on traffic.
   - **Evidence Grid**:
     - Card #1 (Citizen 1): Initial ground-zero report.
     - Card #2 (Citizen 2): West approach traffic impact.
     - Card #3 (Citizen 3): High-resolution photographic evidence rendered securely via a Supabase signed URL.
     - Card #4 (Citizen 4): Local shopkeeper testimony.
   - **Click the "Why linked?" Expander** on Observation #2 or #3:
     - Show the transparent audit trail from `link_decisions`:
       - **Gemma Reason**: *"Both observations describe the same high-pressure water main fracture flooding the roadway at Variety Square."*
       - **Spatial Delta**: `55 m` (within 500 m limit).
       - **Temporal Delta**: `7 min` (within 24 h limit).
       - **Status**: `Passed Validation: YES`.
     - Explain: *"No black boxes. Municipal auditors can inspect the exact mathematical and semantic justification for every correlation."*

---

### Phase 5: Human-in-the-Loop Governance (2:35 – 3:00)
1. **Screen**: Still on `http://localhost:3000/dashboard/incidents/[incident_id]`
2. **Action — Status Workflow**:
   - Use the **Status Selector** dropdown: Change status from `New` $\rightarrow$ `Under Review` $\rightarrow$ `Active`.
   - Scroll down to the **Audit Timeline**: Point out that every status change is immutably logged into `incident_events` with the operator's timestamp.
3. **Action — False-Merge Override ("Detach Observation")**:
   - Find the **"Detach this observation"** button on an observation card.
   - Explain: *"AI assists; humans govern. If an analyst determines that one report actually represents a separate issue, they click 'Detach'. The observation is instantly severed and elevated into its own independent incident cluster with a complete audit record."*
4. **Closing Pitch (2:55 – 3:00)**:
   > *"Civitas Lens proves that local, private models like Google Gemma 4, combined with PostGIS geospatial rigor, can give municipal authorities an autonomous, explainable, and trustworthy emergency intelligence center. Thank you."*

---

## Presenter Quick Checklist Before Demo
- [ ] Next.js server running (`http://localhost:3000`)
- [ ] Ollama running locally with `gemma4:e2b` loaded
- [ ] Demo seeded cleanly: `npm run seed:demo`
- [ ] Browser window open at `http://localhost:3000` with analyst login credentials ready
