# Civitas Lens

### AI-Powered Real-World Incident Intelligence Platform

> **See Beyond the Observation. Understand the Bigger Picture.**

Civitas Lens is an AI-powered platform that transforms scattered real-world observations into structured, connected, and continuously evolving incidents.

Users can submit **text, images, or voice recordings** along with contextual information such as location and time. **Gemma 4** acts as the core intelligence layer, helping the system understand observations, extract meaningful information, identify relationships between reports, and build a unified view of an incident.

**Core idea:**

**Observe → Understand → Connect → Build the Bigger Picture**

---

## 1. Project Name

**Civitas Lens**

**Tagline:** *See Beyond the Observation. Understand the Bigger Picture.*

The name combines *Civitas*, referring to a community/civic society, with *Lens*, representing the platform's ability to look beyond individual observations and understand the larger situation.

---

## 2. Problem Statement

Important incidents, unusual activities, safety concerns, environmental events, accidents, and emerging problems are often first noticed by people on the ground. However, these observations are usually unstructured and scattered across different channels.

People may describe the same underlying incident in completely different ways:

- One person may submit a voice recording.
- Another may upload an image.
- A third may provide additional context through text.
- Each observation may contain only a small part of the overall situation.

Traditional reporting systems often treat these submissions as independent reports. This makes it difficult to determine:

- Whether multiple observations are related.
- What the actual incident is.
- How the situation is evolving.
- Which pieces of evidence belong together.
- What the overall context of the situation is.

**Civitas Lens addresses this gap by using Gemma 4 to understand unstructured observations, extract meaningful information, identify relationships between reports, and continuously build a unified view of real-world incidents.**

Instead of treating every submission as an isolated report, Civitas Lens transforms:

**Individual Observations → Connected Evidence → Unified Incident → Situational Awareness**

---

## 3. Project Overview

Civitas Lens is a multimodal incident intelligence platform designed to convert human observations into connected, structured incident information.

Users can submit:

- Text descriptions
- Images
- Voice recordings
- Location
- Timestamp and other available context

Gemma 4 analyzes the submitted information and helps perform:

- Observation understanding
- Information extraction
- Classification
- Contextual analysis
- Semantic relationship detection
- Incident summarization

The backend combines the AI output with deterministic signals such as location, time, category, and existing incident records.

If multiple observations appear to describe the same underlying event, they can be connected into a single incident while preserving each original observation as evidence.

The result is an evolving incident record containing:

- Supporting evidence
- Timeline
- Location
- AI-generated summary
- Related observations
- Current status
- Contextual information

Civitas Lens is therefore designed not merely as a reporting system, but as an **AI-powered situational-awareness layer**.

---

## 4. Proposed Solution

Civitas Lens uses a hybrid AI and software approach.

```text
User Observation
      |
      | Text / Image / Voice
      | Location + Time
      v
Input Processing
      |
      v
Gemma 4 Analysis
      |
      |-- Understanding
      |-- Classification
      |-- Information Extraction
      |-- Summarization
      |-- Semantic Analysis
      |
      v
Structured Observation
      |
      v
Candidate Incident Retrieval
      |
      |-- Location
      |-- Time
      |-- Category
      |-- Existing Context
      |
      v
Gemma 4 Relationship Analysis
      |
      +----------------+
      |                |
   Related          Unrelated
      |                |
      v                v
Update Existing    Create New
Incident           Incident
      |                |
      +--------+-------+
               |
               v
      Incident Intelligence
               |
               v
        Incident Dashboard
```

### Hybrid Intelligence

**Gemma 4 handles:**
- Natural-language understanding
- Information extraction
- Classification
- Semantic comparison
- Contextual reasoning
- Summarization

**The backend handles:**
- Validation
- Database operations
- Candidate retrieval
- Location/time filtering
- Evidence storage
- Incident creation and updates
- Authentication and permissions
- Workflow management

This keeps AI responsible for tasks requiring semantic understanding while deterministic software controls application state and data integrity.

---

## 5. Objectives

- Capture real-world observations through text, images, and voice.
- Understand unstructured and multimodal information using Gemma 4.
- Convert raw observations into structured incident information.
- Identify relationships between different observations.
- Detect when multiple observations may belong to the same underlying incident.
- Aggregate related observations into a unified incident.
- Preserve original observations as supporting evidence.
- Track how incidents evolve over time.
- Generate concise AI-powered incident summaries.
- Provide contextual information that may not be obvious from individual reports.
- Visualize incidents geographically.
- Maintain an evidence-based incident timeline.
- Reduce fragmented information.
- Demonstrate a meaningful real-world application of Gemma 4.
- Provide a foundation for scalable incident intelligence.

### Core Objective

> **Turn scattered observations into connected intelligence.**

---

## 6. Target Users / Use Case

### Target Users

**General Public**  
People who observe unusual activities, safety concerns, accidents, environmental events, infrastructure problems, or other real-world situations.

**Security and Monitoring Teams**  
Teams responsible for monitoring locations and identifying recurring or unusual activities.

**Local Authorities and Response Teams**  
Authorized personnel who need a consolidated view of incidents and supporting evidence.

**Institutions and Organizations**  
Examples include campuses, colleges, residential communities, industrial facilities, public spaces, and large organizations.

**Analysts and Administrators**  
Users who analyze incident patterns, locations, timelines, and historical evidence.

### Key Use Cases

1. **Unusual Activity Reporting**  
   A user notices something unusual and records it using voice, text, or an image.

2. **Connecting Multiple Observations**  
   Different people report different aspects of the same event. Civitas Lens identifies potential relationships and connects them.

3. **Incident Evolution**  
   New observations are added to an existing incident, allowing the system to track how the situation develops.

4. **Safety and Environmental Situations**  
   The platform can capture accidents, environmental hazards, safety concerns, infrastructure damage, and other emerging events.

5. **Campus / Community Monitoring**  
   Organizations can collect and connect observations occurring across their premises.

6. **Incident Investigation and Review**  
   Authorized users can review the original reports, images, recordings, timeline, AI summary, and relationships between observations.

### Core Use Case

```text
Many People
     |
     v
Many Observations
     |
     v
AI Understanding
     |
     v
Connected Evidence
     |
     v
One Unified Incident
     |
     v
Clearer Situational Awareness
```

---

## 7. Open-Source AI Technology Selected

### Gemma 4

Civitas Lens uses **Gemma 4**, Google's open-weight AI model family, as its core AI intelligence layer.

Gemma 4 is integrated into the application's core workflow rather than being used only as a chatbot.

The model is intended to support tasks such as:

- Text understanding
- Information extraction
- Incident classification
- Semantic relationship analysis
- Contextual reasoning
- Incident summarization
- Multimodal analysis where supported by the selected model/runtime

### Selected Variant: Gemma 4 E4B

| Item | Decision |
|---|---|
| Primary model | **Gemma 4 E4B** (instruction-tuned) |
| Fallback model | **Gemma 4 E2B**, if hardware or latency is constrained |
| Modalities used | Text, image, and audio, all handled by a single model |
| Context window | 128K tokens, enough to compare a new observation against several candidate incidents in one prompt |
| Capabilities used | Multimodal understanding, structured (JSON) output, reasoning, and tool use (stretch goal) |
| Runtime | Hugging Face Transformers behind a small internal FastAPI inference service. Quantized runtimes such as Ollama or llama.cpp are an option if they support audio input at the time of the final |

**Why E4B and not a larger variant:** according to the official model card, audio input is available only on the small Gemma 4 models, while the larger 26B A4B and 31B models accept text and image only. Since voice reports are a core input, E4B is the variant that lets one model handle text, images, and voice. It is also designed for on-device deployment, which supports private, self-hosted operation.

**Audio constraint:** Gemma 4 audio input is limited to 30 seconds per clip. The interface limits each recording to 30 seconds, and longer recordings are split into chunks that are analyzed in order and merged into one observation.

The variant, runtime, and audio support will be re-verified against the official Gemma 4 documentation at the start of the final hackathon.

---

## 8. Why This Technology Was Selected

Civitas Lens requires AI that can understand the **meaning and context** of observations rather than relying only on keywords or fixed rules.

For example, different users might describe the same situation in very different ways:

```text
Observation A:
"Something unusual has been happening near the entrance."

Observation B:
"I noticed repeated activity around the same location."

Observation C:
"I recorded something strange happening here."
```

A keyword-based system may struggle to identify their relationship.

Gemma 4 provides a natural-language intelligence layer capable of interpreting unstructured information and producing structured outputs that the rest of the application can process.

### Why Gemma 4?

- Open-weight model suitable for flexible deployment.
- Suitable for natural-language understanding.
- Useful for structured information extraction.
- Can support semantic and contextual analysis.
- Can be integrated directly into the application's workflow.
- Natively multimodal: the small variants accept text, images, and short audio clips, so one model can cover all three report types and keeps the pipeline simple.
- Supports tool use, which enables an optional bounded agent step (see Section 13).
- Provides flexibility for experimentation and optimization.
- Enables the project to demonstrate meaningful use of an open AI model.

### Key Reason

> **Civitas Lens needs AI that understands what people mean, not just what words they use.**

---

## 9. AI's Role in the System

Gemma 4 acts as the **intelligence layer** of Civitas Lens.

### Observation Understanding

Interprets what a user is describing.

### Information Extraction

Extracts useful information such as:

- Incident type
- Entities
- Objects
- Actions
- Location context
- Time context
- Severity indicators
- Important contextual details

### Incident Classification

Categorizes observations into relevant categories such as:

- Unusual activity
- Safety concern
- Accident
- Environmental issue
- Infrastructure problem
- Other emerging real-world events

### Relationship Detection

Compares a new observation with relevant existing incidents and determines whether they may describe the same or a related event.

### Summarization

Combines multiple observations into a concise incident summary.

### Incident Evolution Analysis

Analyzes new evidence to determine whether an incident has changed, escalated, or gained additional context.

### Example

```text
Observation 1
Voice Recording
      |
      v
Gemma 4
      |
      v
Incident #102

Observation 2
Image
      |
      v
Gemma 4
      |
      v
Potential relationship detected
      |
      v
Incident #102 updated

Observation 3
Text
      |
      v
Gemma 4
      |
      v
Additional context added
```

### AI + Software

```text
Gemma 4
= Understanding + Semantic Intelligence

Backend
= Validation + Storage + Matching + Workflow
```

---

## 10. System Architecture

Civitas Lens follows a hybrid AI architecture:

```text
                    CIVITAS LENS
                         |
                         v
              +---------------------+
              |    User Interface   |
              | Text | Image | Voice|
              +----------+----------+
                         |
                         v
              +---------------------+
              |   Backend / API     |
              |      FastAPI        |
              +----------+----------+
                         |
                         v
              +---------------------+
              |    Gemma 4 AI       |
              |                     |
              | Understanding       |
              | Classification      |
              | Extraction          |
              | Summarization       |
              | Semantic Analysis   |
              +----------+----------+
                         |
                         v
              +---------------------+
              | Incident Intelligence|
              |       Engine         |
              | Candidate Retrieval  |
              | Matching             |
              | Evidence Linking     |
              | Timeline Updates     |
              +----------+----------+
                         |
              +----------+----------+
              |                     |
              v                     v
       PostgreSQL/PostGIS       Media Storage
              |                     |
              +----------+----------+
                         |
                         v
              +---------------------+
              | Incident Dashboard  |
              | Map | Evidence      |
              | Timeline | Summary  |
              | Status              |
              +---------------------+
```

---

## 11. Component-Level Architecture

```text
                         CIVITAS LENS
                              |
          +-------------------+-------------------+
          |                                       |
          v                                       v
  +---------------+                       +---------------+
  | User Interface|                       | Admin /       |
  |               |                       | Authority UI  |
  | Text          |                       | Map           |
  | Image         |                       | Evidence      |
  | Voice         |                       | Timeline      |
  | Location      |                       | Status        |
  +-------+-------+                       +-------+-------+
          |                                       |
          +-------------------+-------------------+
                              |
                              v
                   +---------------------+
                   |   FastAPI Backend   |
                   +----------+----------+
                              |
          +-------------------+-------------------+
          |                   |                   |
          v                   v                   v
 +----------------+  +----------------+  +----------------+
 | Input          |  | Authentication |  | Evidence      |
 | Processing     |  | & Access       |  | Management    |
 | Validation     |  | Users / Roles  |  | Images /Audio |
 +-------+--------+  +----------------+  +-------+--------+
         |                                       |
         +-------------------+-------------------+
                             |
                             v
                  +-----------------------+
                  |     GEMMA 4 ENGINE    |
                  |                       |
                  | Understanding         |
                  | Classification        |
                  | Extraction            |
                  | Semantic Comparison   |
                  | Summarization         |
                  +-----------+-----------+
                              |
                              v
                  +-----------------------+
                  | Incident Intelligence |
                  |       Engine          |
                  | Candidate Retrieval   |
                  | Incident Matching     |
                  | Evidence Linking      |
                  | Timeline Management   |
                  +-----------+-----------+
                              |
                   +----------+----------+
                   |                     |
                   v                     v
           +---------------+     +---------------+
           | PostgreSQL /  |     | Media Storage |
           | PostGIS       |     | Images /Audio |
           +---------------+     +---------------+
```

---

## 12. Data / Information Flow

```text
User Observation
       |
       | Text / Image / Voice
       | Location + Time
       v
+----------------------+
| Input Processing     |
| Validation           |
| Preprocessing        |
+----------+-----------+
           |
           v
+----------------------+
|      Gemma 4         |
|    AI Analysis       |
| Understand           |
| Classify             |
| Extract              |
| Summarize            |
+----------+-----------+
           |
           v
+----------------------+
| Structured           |
| Observation          |
| Type / Context       |
| Location / Time      |
| Entities / Indicators|
+----------+-----------+
           |
           v
+----------------------+
| Candidate Retrieval  |
| Location / Time      |
| Category / Context   |
+----------+-----------+
           |
           v
+----------------------+
| Gemma 4 Semantic     |
| Relationship Analysis|
+----------+-----------+
           |
     +-----+-----+
     |           |
     v           v
  Related       New
     |           |
     v           v
  Update        Create
  Existing      New
  Incident      Incident
     |           |
     +-----+-----+
           |
           v
+----------------------+
| Incident Intelligence|
| Evidence / Timeline  |
| Context / Summary    |
+----------+-----------+
           |
           v
+----------------------+
| Incident Dashboard   |
| Map / Evidence       |
| Timeline / Summary   |
| Status               |
+----------------------+
```

### Core Data Transformation

**Raw Observation → AI Understanding → Structured Data → Relationship Detection → Connected Evidence → Unified Incident → Situational Awareness**

---

## 13. Agentic Workflow (If Applicable)

Civitas Lens does **not** use a fully autonomous agent. It uses a controlled AI pipeline in which Gemma 4 performs defined intelligence tasks, while the deterministic backend owns application state, validation, and every database write. One bounded, tool-using agent step is added as a stretch goal where reasoning over existing incidents benefits from it.

### Core Workflow (MVP)

```text
Observation
     |
     v
Gemma 4 Analysis
     |
     v
Candidate Retrieval
     |
     v
Gemma 4 Relationship Analysis
     |
     v
Backend Validation
     |
     v
Incident Creation / Update
     |
     v
Dashboard
```

This controlled approach provides:

- Predictable behavior
- Better reliability
- Easier debugging
- Clear auditability
- Controlled AI decisions
- Clear separation between AI and business logic

### Bounded Tool-Calling Step (Stretch Goal)

Gemma 4 supports tool use. During relationship analysis, Gemma 4 can act as a small, bounded agent that gathers the context it needs before deciding, instead of receiving a fixed list of candidates.

```text
New Structured Observation
            |
            v
+---------------------------+
| Gemma 4                   |
| Relationship Analysis     |
| (tool-enabled)            |
+-------------+-------------+
              |
              | tool calls (max 3)
              v
+---------------------------+
| Backend Tool Executor     |
| search_candidates()       |
| get_incident()            |
| get_evidence()            |
+-------------+-------------+
              |
              | read-only results
              v
+---------------------------+
| Gemma 4 Decision          |
| Related / Unrelated       |
| + short reasoning         |
+-------------+-------------+
              |
              v
+---------------------------+
| Backend Validation        |
| Distance / Time / Category|
+-------------+-------------+
              |
              v
   Incident Creation / Update
```

**Guardrails:**

- Tools are read-only. Only the backend writes to the database.
- Each observation is limited to 3 tool calls and a fixed timeout.
- Gemma 4's decision is a proposal. The backend validates it before any merge.
- If tool calling fails or returns malformed output, the system falls back to the core workflow, where the deterministic candidate list is passed directly in the prompt.

Future versions may extend this into broader agentic workflows for automated evidence gathering, investigation, or intelligent escalation.

---

## 14. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React.js | User interface and dashboard |
| UI | Tailwind CSS | Responsive interface |
| Backend | Python + FastAPI | REST APIs and business logic |
| AI Model | Gemma 4 E4B (E2B as fallback) | Core AI intelligence: text, image, and audio understanding |
| AI Serving | Hugging Face Transformers behind an internal FastAPI inference service | Running Gemma 4 locally |
| Output Validation | Pydantic | Schema validation of Gemma 4's JSON output, with retry |
| Voice Input | Gemma 4 native audio (30-second clips) | Voice understanding and speech recognition |
| Voice Fallback | Whisper / compatible open-source STT (optional) | Fallback if audio input is unavailable in the chosen runtime |
| Database | PostgreSQL | Structured data |
| Geospatial | PostGIS + GeoAlchemy2 | Location-based queries |
| ORM | SQLAlchemy | Database interaction |
| Maps | OpenStreetMap | Geographic data |
| Map Library | Leaflet / React-Leaflet | Interactive maps |
| Async Processing | FastAPI BackgroundTasks | Non-blocking AI processing (MVP) |
| Media Storage | Local file storage (MVP), object storage later | Images and audio |
| Authentication | JWT with simple role checks | Access control (fine-grained RBAC is a stretch goal) |
| Containerization | Docker / Docker Compose | Deployment consistency |
| Version Control | Git | Source management |
| Repository | GitHub | Collaboration |

---

## 15. Expected Features

### Scope for the Final Hackathon

| Priority | Features |
|---|---|
| **Must have (MVP)** | Text, image, and short voice report submission with location and timestamp; Gemma 4 extraction and classification into validated JSON; candidate retrieval by location, time, and category; Gemma 4 relationship analysis with backend validation; incident creation and merging with original evidence preserved; dashboard with map, timeline, and AI summary |
| **Should have** | Incident status workflow; basic search and filtering; relationship explanation |
| **Stretch** | Bounded tool-calling relationship step; fine-grained role-based access; audit trail; semantic similarity ranking with vector search; alerting |

Demo data: a seeded scenario of several linked reports (voice, image, and text) describing one incident, plus unrelated reports, will be prepared so the incident-linking flow can be demonstrated reliably.

### Multi-Modal Observation Reporting

- Text input
- Image upload
- Voice recording
- Location capture
- Timestamp

### AI-Powered Understanding

Gemma 4 analyzes observations and extracts meaningful information.

### Intelligent Classification

Automatically categorizes observations.

### Related Incident Detection

Identifies whether a new observation may belong to an existing incident.

### Evidence Aggregation

Multiple observations can be connected to one incident while preserving original evidence.

### Incident Timeline

Tracks how an incident evolves as new information arrives.

### AI-Generated Incident Summary

Creates a concise summary from multiple observations.

### Interactive Incident Map

Displays incidents geographically.

### Incident Dashboard

Displays:

- Active incidents
- Location
- Evidence
- Timeline
- AI summary
- Category
- Status
- Related observations

### Search and Filtering (Should Have)

Search by:

- Category
- Location
- Date
- Status
- Keywords

### Evidence-Based Relationship Explanation

Shows contextual factors behind potential relationships between observations.

### Incident Workflow (Should Have)

Authorized users can manage:

```text
New → Under Review → Active → Resolved → Archived
```

### Privacy and Access Control

Protects sensitive information through authentication and role-based permissions. Basic roles are part of the MVP; fine-grained RBAC is a stretch goal.

### Audit Trail (Stretch)

Maintains original observations and historical incident updates.

---

## 16. Implementation Approach

Civitas Lens will be implemented using a modular hybrid AI architecture.

**Build order:** Phases 1 to 5 and the core of Phase 7 are built first to get one complete end-to-end flow working. Should-have and stretch features are added only after that flow works.

### Phase 1 — User Reporting

Develop interfaces for:

- Text reporting
- Image upload
- Voice recording
- Location capture

### Phase 2 — Input Processing

The backend will:

- Validate incoming requests
- Store original evidence
- Process uploaded media
- Enforce the 30-second audio limit per clip, splitting longer recordings into ordered chunks
- Prepare AI inputs, with image and audio placed before the text in the prompt
- Pass audio directly to Gemma 4 (open-source speech-to-text is used only as a fallback)

### Phase 3 — Gemma 4 Integration

Gemma 4 processes each observation and returns structured information. Output is requested as JSON and validated against a Pydantic schema. If validation fails, the request is retried once and then flagged for review.

```text
Raw Observation
       |
       v
Gemma 4
       |
       v
Structured JSON
       |
       v
Backend Validation
```

Example output:

```json
{
  "category": "unusual_activity",
  "summary": "Observation indicates unusual activity near the entrance.",
  "location_context": "entrance area",
  "severity": "medium",
  "key_entities": [],
  "related_incident_id": null
}
```

### Phase 4 — Candidate Retrieval

The backend searches existing incidents using:

- Location
- Time
- Category
- Context
- Optional semantic similarity

### Phase 5 — Relationship Analysis

Gemma 4 compares the new observation with relevant candidates.

```text
New Observation
       |
       v
Candidate Incidents
       |
       v
Gemma 4 Comparison
       |
   +---+---+
   |       |
Related  New
   |       |
   v       v
Update   Create
Incident Incident
```

The merge decision is gated by deterministic rules (distance threshold, time window, and category compatibility). Gemma 4's output is treated as a proposal, and any confidence it reports is only a minor additional signal. As a stretch goal, this step can be replaced by the bounded tool-calling workflow described in Section 13.

### Phase 6 — Incident Intelligence

The system maintains:

- Evidence
- Timeline
- Location
- AI summary
- Related observations
- Status
- Context

### Phase 7 — Dashboard

Develop the incident dashboard containing:

- Incident map
- Incident list
- Evidence
- Timeline
- AI summary
- Relationships
- Status

### Phase 8 — Testing and Validation

Test cases will include:

- Same incident with different descriptions
- Completely unrelated observations
- Multiple observations from different users
- Voice + text
- Image + text
- Audio clips near the 30-second limit and longer recordings that need chunking
- Malformed or invalid JSON from the model
- Changing incident context
- False relationship cases

### Phase 9 — Demo Preparation

- Seed one multi-report incident (voice, image, and text from different users) plus unrelated decoy reports.
- Prepare a scripted demo path through the dashboard.
- Keep pre-recorded sample inputs as a fallback if live capture fails.

---

## 17. Expected Final Output

The final output will be a functional AI-powered incident intelligence platform capable of transforming scattered observations into connected incidents.

### Expected Deliverables

- Multi-modal observation interface
- Gemma 4-powered AI analysis
- Structured incident generation
- Related incident detection
- Unified incident records
- AI-generated summaries
- Dynamic incident timelines
- Interactive incident map
- Evidence management
- Incident dashboard
- Search and filtering (should have)
- Status management (should have)
- Audit trail (stretch)
- Role-based access (basic roles in MVP, fine-grained RBAC is a stretch goal)

### Example

```text
Person A
   |
   | Voice Observation
   v
Gemma 4
   |
   v
Incident #102
   |
   +---- Person B -> Image
   |
   +---- Person C -> Text
   |
   +---- Person D -> Voice
              |
              v
       Gemma 4 Relationship Analysis
              |
              v
        ONE UNIFIED INCIDENT
              |
              v
+--------------------------------+
| Incident #102                  |
|                                |
| AI Summary                     |
| Location                       |
| Evidence x 4                   |
| Timeline                       |
| Related Observations           |
| Current Status                 |
+--------------------------------+
```

### Final Transformation

> **Many people see different pieces of an event → Civitas Lens connects those pieces and reveals the bigger picture.**

---

## 18. Future Scope / Scalability

### Future Scope

#### Advanced Multimodal Intelligence

Improve understanding of combinations of text, images, audio, and other evidence.

#### Multilingual Reporting

Support regional and international languages.

#### Real-Time Incident Monitoring

Process incoming observations continuously.

#### Predictive Intelligence

Use historical incident data to identify:

- Recurring patterns
- Hotspots
- Emerging risks
- Possible escalation

#### Automated Alerting

Notify authorized users when incidents reach predefined conditions.

#### Cross-Source Evidence Correlation

Connect observations from multiple authorized sources.

#### Mobile Application

Extend Civitas Lens to Android and iOS.

#### Specialized AI Models

Integrate specialized computer-vision, speech, or domain-specific models alongside Gemma 4 where necessary.

#### Edge / Offline Processing

Support environments with limited connectivity where hardware permits.

#### External Integrations

Provide APIs for integration with authorized institutional, emergency-response, security, and monitoring systems.

### Scalability

The architecture can scale by independently expanding backend instances, AI inference workers, database capacity, and media storage.

```text
Users
  |
  v
Load Balancer
  |
  v
Multiple Backend Instances
  |
  v
AI Processing Workers
  |
  v
Incident Intelligence Services
  |
  +----------------+
  |                |
  v                v
PostgreSQL       Media Storage
/PostGIS
```

The MVP uses FastAPI background tasks so AI processing does not block user-facing requests. For higher workloads, message queues and dedicated inference workers can be introduced.

---

## 19. Open-Source Dependencies / Components

| Component | Technology | Purpose |
|---|---|---|
| AI Model | Gemma 4 E4B (E2B fallback) | Core AI intelligence for text, image, and audio |
| Model Serving | Hugging Face Transformers | Running Gemma 4 locally |
| Backend | FastAPI | API and backend services |
| Validation | Pydantic | Validating structured AI output |
| Frontend | React.js | User interface |
| UI Framework | Tailwind CSS | Interface styling |
| Database | PostgreSQL | Structured storage |
| Geospatial | PostGIS + GeoAlchemy2 | Spatial queries |
| ORM | SQLAlchemy | Database interaction |
| Voice Processing | Gemma 4 native audio; Whisper / compatible open-source STT as optional fallback | Voice understanding and speech-to-text |
| Maps | OpenStreetMap | Geographic data |
| Map Library | Leaflet / React-Leaflet | Interactive maps |
| Containers | Docker / Docker Compose | Deployment |
| Version Control | Git | Source management |
| Repository | GitHub | Collaboration |

### Open-Source Benefits

Using open-source components provides:

- Flexibility
- Customization
- Reduced dependency on proprietary systems
- Greater deployment control
- Easier experimentation
- Transparent architecture
- Potential for local/private deployment

> **Note:** Gemma is an open-weight model family. The applicable model license and usage terms should be verified before deployment.

---

## 20. Expected Challenges and Mitigation

| Challenge | Mitigation |
|---|---|
| Multimodal input complexity | Use a standardized preprocessing pipeline for text, image, and voice. |
| Different descriptions of the same event | Combine Gemma semantic comparison with location, time, and category signals. |
| False incident relationships | Require deterministic validation (distance, time window, category) before merging. Gemma 4's output is a proposal and its confidence is only a secondary signal. |
| AI hallucination or incorrect interpretation | Treat AI output as an analysis signal, validate structured responses, and preserve original evidence. |
| Voice quality, transcription errors, and the 30-second audio limit | Use Gemma 4's native audio understanding on clips up to 30 seconds, split longer recordings into chunks, keep the original audio as evidence, and allow correction of extracted information. Open-source speech-to-text is an optional fallback. |
| Poor image quality | Combine image analysis with text, location, time, and other evidence. |
| Large report volume | Use candidate retrieval, asynchronous processing, caching, and scalable inference workers. |
| Privacy concerns | Apply authentication, access control, secure storage, and data minimization. |
| False or malicious submissions | Add validation, abuse controls, evidence preservation, and human review for critical incidents. |
| Gemma resource requirements | Use E4B (E2B as fallback), quantization where supported, and background processing. Keep Gemma calls to two per observation. |
| Incorrect incident merging | Allow authorized users to review and separate incorrectly linked incidents. |
| Real-time performance | Use background processing and asynchronous AI tasks for heavier operations. |
| Malformed or inconsistent structured output | Request JSON, validate with Pydantic, retry once, then flag the observation for review. |
| Unreliable tool calling by a small model | Keep tools read-only, cap tool calls, and fall back to the deterministic pipeline. |
| Limited hackathon time | Follow the defined MVP scope, add stretch features only after the end-to-end flow works, and use seeded demo data. |
| Historical context loss | Preserve every original observation and maintain a complete incident timeline. |

---

# Core Design Principle

```text
                 HUMAN OBSERVATIONS
                         |
                         v
                    GEMMA 4
                         |
                  AI UNDERSTANDING
                         |
                         v
              STRUCTURED INFORMATION
                         |
                         v
               RELATIONSHIP ANALYSIS
                         |
                         v
                CONNECTED EVIDENCE
                         |
                         v
                 UNIFIED INCIDENT
                         |
                         v
             SITUATIONAL AWARENESS
```

> **Gemma 4 understands the information.  
> Civitas Lens controls, validates, connects, and presents it.**

---

# Vision

Civitas Lens aims to bridge the gap between:

**What people observe → What organizations understand**

Instead of simply asking:

> *“How many reports were received?”*

Civitas Lens aims to answer:

> **“What is actually happening, and how do all these observations connect?”**

---

## Project Tagline

### **Civitas Lens**
### *See Beyond the Observation. Understand the Bigger Picture.*
