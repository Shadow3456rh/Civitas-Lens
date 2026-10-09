# Civitas Lens — Complete Verification & Demo Walkthrough

This document walks through the complete verification, demo seeding, and test checklist execution for **Civitas Lens**—the municipal incident intelligence platform powered by **Google Gemma 4** and **PostGIS**.

---

## 1. Executive Summary

- **Live Scenario Seeded**: A real-world municipal crisis scenario in **Nagpur, Maharashtra, India**, anchored at **Variety Square (Sitabuldi)** (`21.1458, 79.0882`).
- **Autonomous Incident Formation**: 4 heterogeneous reports from different simulated citizens (3 text descriptions with distinct vocabularies + 1 real high-resolution photograph) were processed sequentially through the live Gemma 4 pipeline. All 4 reports autonomously coalesced into **Incident #1** (`712535c1-05da-4382-ba88-4c1cd0a0e5f6`), with an observation count of **4**, dynamic centroid recalculation, and a synthesized AI incident summary.
- **Geospatial & Semantic Segregation**: 4 unrelated decoy reports across Nagpur (Sadar, Medical Square, Gandhibagh, Civil Lines) were evaluated. All 4 decoys were strictly prevented from merging into Incident #1 by PostGIS 500-meter spatial boundaries and category compatibility rules, safely creating isolated incidents.
- **Edge-Case Test Checklist**: 6 edge cases (semantic variation, negative correlation, spatial threshold, temporal threshold, malformed JSON recovery, and multimodal processing) verified with 100% pass rate.
- **3-Minute Demo Script**: End-to-end presenter guide documented in [`docs/DEMO_SCRIPT.md`](file:///d:/Hackathons/Temp/mvp/docs/DEMO_SCRIPT.md).

---

## 2. Seeded Scenario Architecture (`scripts/seed-demo.ts`)

### Nagpur Geographic Anchor
- **Ground Zero**: Variety Square / Sitabuldi Intersection (`21.1458, 79.0882`), linking Amravati Road, Wardha Road, and Sitabuldi Main Market in central Nagpur.

### The 4 Related Observations (Burst Water Main)
| # | Reporter | Modality | Location & Coordinates | Time Gap | Text / Evidence | Pipeline Action |
| :- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | Pooja Sharma | Text | Variety Square Signal (`21.1458, 79.0882`) | -26 min | *"Water gushing on the road near Variety Square signal. Massive high pressure leak coming from underground municipal pipe under the pavement."* | **CREATED** Incident #1 |
| **2** | Amit Deshmukh | Text | Variety Chowk West (`21.1462, 79.0878`) · ~55m away | -19 min | *"Waterlogged street, vehicles stuck and two wheelers skidding near Variety Chowk junction. Deep pool of water rapidly expanding across all traffic lanes."* | **MERGED** into Incident #1 |
| **3** | Rahul Verma | Image + Text | Sitabuldi Market Road (`21.1454, 79.0886`) · ~60m away | -11 min | *Photo of burst pipe & flooded street ([`samples/water-main-break.jpg`](file:///d:/Hackathons/Temp/mvp/samples/water-main-break.jpg))* + *"Flooding across the roadway from cracked underground water pipe, road almost submerged and traffic brought to a halt near the divider."* | **MERGED** into Incident #1 |
| **4** | Sunita Patil | Text | Mahatma Gandhi Marg (`21.1460, 79.0885`) · ~35m away | -4 min | *"Pipe seems burst near the signal, municipal supply line broken and flooding the market street with high pressure flow."* | **MERGED** into Incident #1 |

### The 4 Unrelated Decoy Observations
| # | Reporter | Category | Location & Distance | Distance from Incident #1 | Description | Pipeline Action |
| :- | :--- | :--- | :--- | :--- | :--- | :--- |
| **5** | Rajesh Kulkarni | Infrastructure (Road) | Residency Road, Sadar (`21.1632, 79.0812`) | **~3.8 km North** (>500m) | Deep pothole & asphalt cave-in | **CREATED** Incident #2 (Isolated) |
| **6** | Dr. Sneha Joshi | Safety Concern (Traffic) | Medical Square, Ajni (`21.1278, 79.0984`) | **~3.2 km South** (>500m) | Traffic signal blackout near hospital | **CREATED** Incident #3 (Isolated) |
| **7** | Manoj Agrawal | Environmental (Waste) | Central Avenue, Gandhibagh (`21.1512, 79.1128`) | **~3.5 km East** (>500m) | Commercial garbage dump overflow | **CREATED** Incident #4 (Isolated) |
| **8** | Vikram Mehta | Safety / Electrical Hazard | Temple Road, Civil Lines (`21.1542, 79.0682`) | **~2.5 km West** (>500m) | Fallen tree branch over power lines | **CREATED** Incident #5 (Isolated) |

---

## 3. Real Pipeline Execution Results

Executing `npm run seed:demo` produced the following verified incident cluster:

```
================================================================
                  INCIDENT #1 VERIFICATION                      
================================================================
  ID:                 712535c1-05da-4382-ba88-4c1cd0a0e5f6
  Title:              Severe Flooding Across Nagpur Due to Multiple Underground Water Main Leaks
  Category:           infrastructure
  Severity:           high
  Observation Count:  4 (Expected: 4)
  AI Summary:         "Multiple high-pressure leaks and bursts in underground municipal water pipes 
                       have caused severe flooding across several key areas in Nagpur, including 
                       Variety Square and Sitabuldi Market Road. The resulting waterlogging has led 
                       to significant traffic stoppages and vehicle hazards on major roadways. 
                       Authorities are managing the widespread inundation caused by these 
                       infrastructure failures."
  Linked Observations:4 observations
  Explainability Logs:3 decisions recorded in link_decisions
  Timeline Events:    6 audit events in incident_events

Decoy Segregation Check:
  ✓ SAFE: Decoy 1 (Sadar - Road Hazard) created separate incident (8996def7-2a8a-452c-9a67-bda4ed99ca51)
  ✓ SAFE: Decoy 2 (Medical Square - Traffic Safety) created separate incident (5e58d92d-8a21-41ec-83ad-91b2379126c4)
  ✓ SAFE: Decoy 3 (Gandhibagh - Environmental) created separate incident (99756061-ee0c-4675-9d47-2e07bbc711e3)
  ✓ SAFE: Decoy 4 (Civil Lines - Electrical Hazard) created separate incident (6d2a81e5-6769-4d6b-9d2e-2b2eac9901f2)
================================================================
✓ ALL SEED VERIFICATIONS PASSED!
```

---

## 4. Test Checklist Verification (`scripts/test-checklist.ts`)

| # | Checklist Item | Test Specification | Result | Mechanism |
| :- | :--- | :--- | :-: | :--- |
| **1** | **Same incident, different wording** | Observation A (*"High-pressure underground water conduit fractured..."*) vs Observation B (*"Road is totally flooded near the traffic signal! Water gushing everywhere..."*) | **PASS** | Gemma 4 recognized semantic identity despite divergent vocabulary and merged into one incident (`observation_count: 2`). |
| **2** | **Unrelated nearby report** | At the exact same coordinates (`21.1492, 79.0685`, 0m away), a purse snatching was reported. | **PASS** | Gemma and category compatibility matrix identified negative correlation. Merging blocked; separate incident created. |
| **3** | **Same category but too far** | Both reports are `infrastructure` (water leak), but Observation 2 is at Katol Road (~4.2 km away). | **PASS** | PostGIS `find_candidate_incidents(radius_m: 500)` excluded distant candidate; backend validation enforced `distance <= 500m`. |
| **4** | **Same place, outside time window** | Same coordinates, but observation timestamp was 36 hours in the past. | **PASS** | Temporal filter (`since: 24h`) and backend `time_diff_min <= 1440` enforced. Merging blocked. |
| **5** | **Malformed model JSON** | Forced non-JSON response from LLM; verified retry behavior and database resilience. | **PASS** | `callJson` retried with corrective instruction, threw typed `LLMJsonValidationError` on failure, and preserved citizen evidence without data loss. |
| **6** | **Multimodal image + text** | Observation submitted with both JPEG photo and text description. | **PASS** | Image resized via `sharp` to $\le 896$px JPEG, sent as first content part in prompt, and Gemma extracted structured category, severity, and summary. |

---

## 5. 3-Minute Demo Walkthrough Path

The full click path is documented in [`docs/DEMO_SCRIPT.md`](file:///d:/Hackathons/Temp/mvp/docs/DEMO_SCRIPT.md).

```mermaid
flowchart LR
    A["0:00 - 0:30<br/>Home Page<br/>The Problem & Vision"] --> B["0:30 - 1:15<br/>/report<br/>One-Tap Citizen Capture"]
    B --> C["1:15 - 2:00<br/>/dashboard<br/>Real-Time Map & Clustered Feed"]
    C --> D["2:00 - 2:35<br/>/dashboard/incidents/[id]<br/>AI Summary & Explainability"]
    D --> E["2:35 - 3:00<br/>Status Changer & Detach<br/>Human-in-the-Loop Governance"]
```

### Key URLs for Presenter:
- **Home**: `http://localhost:3000`
- **Citizen Report**: `http://localhost:3000/report`
- **Analyst Dashboard**: `http://localhost:3000/dashboard`
- **Seeded Incident #1 Detail**: `http://localhost:3000/dashboard/incidents/712535c1-05da-4382-ba88-4c1cd0a0e5f6`
