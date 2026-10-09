/**
 * Civitas Lens — Realistic Demo Data Seeder for Nagpur
 *
 * Seeds a realistic civic incident scenario near Variety Square, Sitabuldi, Nagpur:
 * - 4 Related Reports from different simulated citizens:
 *     1. Text: "Water gushing on the road near Variety Square signal..."
 *     2. Text: "Waterlogged street, vehicles stuck and two wheelers skidding..."
 *     3. Image + Text: Flooded roadway photo (/samples/water-main-break.jpg) + description
 *     4. Text: "Pipe seems burst near the signal, municipal supply line broken..."
 * - 4 Unrelated Decoy Reports across different locations/categories in Nagpur:
 *     5. Sadar (3.8km north): Pothole & asphalt cave-in on Residency Road
 *     6. Medical Square (3.2km south): Traffic signal blackout near hospital
 *     7. Gandhibagh (3.5km east): Commercial garbage dump overflow on Central Avenue
 *     8. Civil Lines (2.5km west): Fallen tree branch over power lines on Temple Road
 *
 * Each observation is inserted and processed sequentially through the real
 * Gemma 4 pipeline (processObservation) so that:
 * - Report 1 creates Incident #1.
 * - Reports 2, 3, 4 are compared by Gemma, recognized as the same water main break,
 *   pass backend distance/time/category validation, and merge into Incident #1.
 * - Decoys are outside the 500m radius threshold and form their own separate incidents.
 *
 * Run with: npm run seed:demo
 */

import fs from "fs";
import path from "path";
import { getAdminClient } from "../src/lib/supabase/admin";
import { processObservation } from "../src/lib/pipeline/process";

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

// Real Nagpur Coordinates (Variety Square / Sitabuldi Anchor)
const NAGPUR_LOCATIONS = {
  // Related Cluster: Variety Square, Sitabuldi (~0 to 60 meters apart)
  VARIETY_SQUARE_SIGNAL: { lat: 21.1458, lng: 79.0882, label: "Variety Square Signal, Sitabuldi, Nagpur" },
  VARIETY_CHOWK_WEST: { lat: 21.1462, lng: 79.0878, label: "Variety Chowk West, Amravati Road approach, Nagpur" },
  SITABULDI_MARKET_ROAD: { lat: 21.1454, lng: 79.0886, label: "Sitabuldi Market Road, Variety Square, Nagpur" },
  MG_MARG_SIGNAL: { lat: 21.1460, lng: 79.0885, label: "Mahatma Gandhi Marg, Variety Square, Nagpur" },

  // Decoys: Different locations across Nagpur (2.5km to 3.8km away)
  SADAR_RESIDENCY_ROAD: { lat: 21.1632, lng: 79.0812, label: "Residency Road, Sadar, Nagpur" }, // ~3.8km North
  MEDICAL_SQUARE: { lat: 21.1278, lng: 79.0984, label: "Medical Square, Ajni, Nagpur" }, // ~3.2km South
  GANDHIBAGH_CENTRAL_AVE: { lat: 21.1512, lng: 79.1128, label: "Central Avenue, Gandhibagh, Nagpur" }, // ~3.5km East
  CIVIL_LINES_TEMPLE_RD: { lat: 21.1542, lng: 79.0682, label: "Temple Road, Civil Lines, Nagpur" }, // ~2.5km West
};

interface SeedReportDef {
  titleKey: string;
  reporterLabel: string;
  modality: "text" | "image";
  rawText: string;
  sampleImagePath?: string;
  storageImagePath?: string;
  location: { lat: number; lng: number; label: string };
  accuracyM: number;
  minutesAgo: number;
  isRelated: boolean;
  userCategory: string;
  userUrgency: "low" | "medium" | "high";
  reporterName?: string;
  reporterContact?: string;
}

const SEED_REPORTS: SeedReportDef[] = [
  // ─── 4 RELATED REPORTS (Burst Water Main / Street Flooding) ───
  {
    titleKey: "Report 1 (Citizen A - Ground Zero)",
    reporterLabel: "Citizen 1 (Pooja Sharma)",
    modality: "text",
    rawText:
      "Water gushing on the road near Variety Square signal. Massive high pressure leak coming from underground municipal pipe under the pavement.",
    location: NAGPUR_LOCATIONS.VARIETY_SQUARE_SIGNAL,
    accuracyM: 6.8,
    minutesAgo: 26,
    isRelated: true,
    userCategory: "Water / drainage",
    userUrgency: "high",
    reporterName: "Pooja Sharma",
    reporterContact: "pooja.sharma@gmail.com",
  },
  {
    titleKey: "Report 2 (Citizen B - Traffic Jam)",
    reporterLabel: "Citizen 2 (Amit Deshmukh)",
    modality: "text",
    rawText:
      "Waterlogged street, vehicles stuck and two wheelers skidding near Variety Chowk junction. Deep pool of water rapidly expanding across all traffic lanes.",
    location: NAGPUR_LOCATIONS.VARIETY_CHOWK_WEST,
    accuracyM: 9.4,
    minutesAgo: 19,
    isRelated: true,
    userCategory: "Water / drainage",
    userUrgency: "medium",
    reporterName: "Amit Deshmukh",
    reporterContact: "+91 98230 11223",
  },
  {
    titleKey: "Report 3 (Citizen C - Photographic Evidence)",
    reporterLabel: "Citizen 3 (Rahul Verma)",
    modality: "image",
    sampleImagePath: path.resolve(process.cwd(), "samples", "water-main-break.jpg"),
    storageImagePath: "observations/seed-demo-water-break.jpg",
    rawText:
      "Flooding across the roadway from cracked underground water pipe, road almost submerged and traffic brought to a halt near the divider.",
    location: NAGPUR_LOCATIONS.SITABULDI_MARKET_ROAD,
    accuracyM: 5.2,
    minutesAgo: 11,
    isRelated: true,
    userCategory: "Water / drainage",
    userUrgency: "high",
    reporterName: "Rahul Verma",
    reporterContact: "rahul.v@outlook.com",
  },
  {
    titleKey: "Report 4 (Citizen D - Nearby Shopkeeper)",
    reporterLabel: "Citizen 4 (Sunita Patil)",
    modality: "text",
    rawText:
      "Pipe seems burst near the signal, municipal supply line broken and flooding the market street with high pressure flow.",
    location: NAGPUR_LOCATIONS.MG_MARG_SIGNAL,
    accuracyM: 7.1,
    minutesAgo: 4,
    isRelated: true,
    userCategory: "Water / drainage",
    userUrgency: "medium",
    reporterName: "Sunita Patil",
    reporterContact: "+91 94221 44556",
  },

  // ─── 4 UNRELATED DECOYS (Different Locations & Categories) ───
  {
    titleKey: "Decoy 1 (Sadar - Road Hazard)",
    reporterLabel: "Citizen 5 (Rajesh Kulkarni)",
    modality: "text",
    rawText:
      "Deep dangerous pothole and asphalt road cave-in on Residency Road near Sadar shopping strip. Vehicles swerving dangerously into oncoming traffic.",
    location: NAGPUR_LOCATIONS.SADAR_RESIDENCY_ROAD,
    accuracyM: 11.5,
    minutesAgo: 48,
    isRelated: false,
    userCategory: "Road / pothole",
    userUrgency: "high",
    reporterName: "Rajesh Kulkarni",
    reporterContact: "rajesh.k@rediffmail.com",
  },
  {
    titleKey: "Decoy 2 (Medical Square - Traffic Safety)",
    reporterLabel: "Citizen 6 (Dr. Sneha Joshi)",
    modality: "text",
    rawText:
      "Traffic signal completely blacked out at Medical Square intersection. Heavy congestion and multiple near-miss collisions near Government Medical College gate.",
    location: NAGPUR_LOCATIONS.MEDICAL_SQUARE,
    accuracyM: 14.2,
    minutesAgo: 65,
    isRelated: false,
    userCategory: "Safety / suspicious activity",
    userUrgency: "high",
    reporterName: "Dr. Sneha Joshi",
    reporterContact: "dr.sneha.j@gmail.com",
  },
  {
    titleKey: "Decoy 3 (Gandhibagh - Environmental)",
    reporterLabel: "Citizen 7 (Manoj Agrawal)",
    modality: "text",
    rawText:
      "Severe commercial garbage dump overflow and toxic stench blocking the pedestrian footpath along Central Avenue near Gandhibagh garden.",
    location: NAGPUR_LOCATIONS.GANDHIBAGH_CENTRAL_AVE,
    accuracyM: 16.0,
    minutesAgo: 85,
    isRelated: false,
    userCategory: "Garbage / sanitation",
    userUrgency: "low",
    reporterName: "Manoj Agrawal",
    reporterContact: "manoj.agrawal@gmail.com",
  },
  {
    titleKey: "Decoy 4 (Civil Lines - Electrical Hazard)",
    reporterLabel: "Citizen 8 (Vikram Mehta)",
    modality: "text",
    rawText:
      "Large dry gulmohar tree branch snapped and resting precariously over overhead high-voltage electricity lines on Temple Road.",
    location: NAGPUR_LOCATIONS.CIVIL_LINES_TEMPLE_RD,
    accuracyM: 6.0,
    minutesAgo: 115,
    isRelated: false,
    userCategory: "Streetlight / electricity",
    userUrgency: "high",
    reporterName: "Vikram Mehta",
    reporterContact: "+91 98900 77889",
  },
];

/**
 * Ensures or creates a citizen user in Supabase Auth so reporter_id foreign keys resolve cleanly.
 */
async function getOrCreateReporter(supabase: any, email: string): Promise<string | null> {
  try {
    const { data: usersData } = await supabase.auth.admin.listUsers();
    const existing = usersData?.users?.find((u: any) => u.email === email);
    if (existing) return existing.id;

    const { data: created, error } = await supabase.auth.admin.createUser({
      email,
      password: "DemoCitizenPassword123!",
      email_confirm: true,
      user_metadata: { full_name: email.split("@")[0].replace(".", " ") },
    });

    if (error || !created?.user) {
      return null;
    }
    return created.user.id;
  } catch {
    return null;
  }
}

/**
 * Clean up previous demo seed rows for a pristine, deterministic run.
 */
async function cleanPreviousDemoSeed(supabase: any) {
  console.log(`${YELLOW}Cleaning up prior Nagpur demo records for a clean run...${RESET}`);

  // Find observations with location labels matching Nagpur demo locations
  const { data: obsList } = await supabase
    .from("observations")
    .select("id, incident_id")
    .like("location_label", "%Nagpur%");

  if (obsList && obsList.length > 0) {
    const obsIds = obsList.map((o: any) => o.id);
    const incIds = Array.from(new Set(obsList.map((o: any) => o.incident_id).filter(Boolean)));

    // Delete observations
    await supabase.from("observations").delete().in("id", obsIds);

    // Clean up empty incidents
    if (incIds.length > 0) {
      await supabase.from("incidents").delete().in("id", incIds);
    }
    console.log(`  ${GREEN}✓${RESET} Removed ${obsIds.length} prior observations and ${incIds.length} incidents.`);
  } else {
    console.log(`  ${GREEN}✓${RESET} Database clean, no stale Nagpur demo data found.`);
  }
}

async function main() {
  console.log(`\n${CYAN}================================================================${RESET}`);
  console.log(`${CYAN}${BOLD}       Civitas Lens — Nagpur Demo Scenario Seeder              ${RESET}`);
  console.log(`${CYAN}================================================================${RESET}\n`);

  const supabase = getAdminClient();

  // 1. Clean previous demo seed for clean demonstration
  await cleanPreviousDemoSeed(supabase);

  // 2. Prepare and upload sample image to Supabase Storage
  console.log(`\n${YELLOW}[Step 1/3] Uploading photographic evidence to Supabase Storage...${RESET}`);
  const sampleImagePath = path.resolve(process.cwd(), "samples", "water-main-break.jpg");
  if (!fs.existsSync(sampleImagePath)) {
    throw new Error(`Sample image not found at ${sampleImagePath}. Ensure it exists in /samples!`);
  }

  const imageBuffer = fs.readFileSync(sampleImagePath);
  const storagePath = "observations/seed-demo-water-break.jpg";

  const { error: uploadError } = await supabase.storage
    .from("evidence")
    .upload(storagePath, imageBuffer, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (uploadError) {
    console.warn(`  ${YELLOW}⚠ Storage upload warning:${RESET} ${uploadError.message}`);
  } else {
    console.log(`  ${GREEN}✓${RESET} Uploaded ${sampleImagePath} (${(imageBuffer.length / 1024).toFixed(1)} KB) -> storage:${storagePath}`);
  }

  // 3. Process the 8 reports through the live pipeline
  console.log(`\n${YELLOW}[Step 2/3] Executing real Gemma 4 pipeline on 8 reports...${RESET}`);

  const processedReports: Array<{
    reportDef: SeedReportDef;
    observationId: string;
    incidentId: string | null;
    action: string;
    status: string;
    category?: string;
    severity?: string;
  }> = [];

  let primaryIncidentId: string | null = null;

  for (let i = 0; i < SEED_REPORTS.length; i++) {
    const rep = SEED_REPORTS[i];
    const isImageReport = rep.modality === "image";
    const email = `reporter${i + 1}@nagpur.civitas.internal`;
    const reporterId = await getOrCreateReporter(supabase, email);

    const observedAt = new Date(Date.now() - rep.minutesAgo * 60 * 1000).toISOString();
    const pointWkt = `POINT(${rep.location.lng} ${rep.location.lat})`;

    console.log(`\n${CYAN}----------------------------------------------------------------${RESET}`);
    console.log(`${BOLD}[${i + 1}/8] ${rep.titleKey}${RESET} (${rep.reporterLabel})`);
    console.log(`     Location: ${rep.location.label} (${rep.location.lat}, ${rep.location.lng})`);
    console.log(`     Modality: ${rep.modality.toUpperCase()} | Time: ${rep.minutesAgo}m ago`);
    console.log(`     Text: "${rep.rawText.slice(0, 75)}..."`);

    const currentYear = new Date().getFullYear();
    const referenceCode = `CL-${currentYear}-${String(i + 1).padStart(6, "0")}`;

    // Insert pending observation
    const observationPayload: any = {
      reporter_id: reporterId,
      raw_text: rep.rawText,
      user_category: rep.userCategory,
      user_urgency: rep.userUrgency,
      reporter_name: rep.reporterName,
      reporter_contact: rep.reporterContact,
      reference_code: referenceCode,
      modality: rep.modality,
      image_path: isImageReport ? rep.storageImagePath : null,
      location: pointWkt,
      location_label: rep.location.label,
      location_accuracy_m: rep.accuracyM,
      capture_source: isImageReport ? "live_camera" : "gallery_upload",
      location_source: "gps",
      captured_at: observedAt,
      observed_at: observedAt,
      processing_status: "pending",
      ai_raw: {
        reference_code: referenceCode,
        user_category: rep.userCategory,
        user_urgency: rep.userUrgency,
        reporter_name: rep.reporterName,
        reporter_contact: rep.reporterContact,
      },
    };

    let { data: insertedObs, error: insertError } = await supabase
      .from("observations")
      .insert(observationPayload)
      .select("id")
      .single();

    if (insertError) {
      // Fallback if migration 00012 columns are not yet in Supabase schema
      delete observationPayload.user_category;
      delete observationPayload.user_urgency;
      delete observationPayload.reporter_name;
      delete observationPayload.reporter_contact;
      delete observationPayload.reference_code;
      const fallbackResult = await supabase
        .from("observations")
        .insert(observationPayload)
        .select("id")
        .single();
      insertedObs = fallbackResult.data;
      insertError = fallbackResult.error;
    }

    if (insertError || !insertedObs) {
      console.error(`  ${RED}✗ Failed to insert observation:${RESET}`, insertError?.message);
      continue;
    }

    const obsId = insertedObs.id;
    console.log(`     Inserted observation ID: ${obsId}`);
    console.log(`     Running processObservation() through Gemma 4...`);

    const startTime = Date.now();
    const pipelineResult = await processObservation(obsId);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    // Fetch enriched observation data
    const { data: updatedObs } = await supabase
      .from("observations")
      .select("category, severity, incident_id")
      .eq("id", obsId)
      .single();

    console.log(
      `     ${GREEN}✓ Pipeline Completed in ${duration}s${RESET} | Action: ${BOLD}${pipelineResult.action.toUpperCase()}${RESET} | Incident: ${pipelineResult.incidentId}`,
    );
    console.log(
      `       Category: ${updatedObs?.category} | Severity: ${updatedObs?.severity} | Status: ${pipelineResult.status}`,
    );

    if (i === 0 && pipelineResult.incidentId) {
      primaryIncidentId = pipelineResult.incidentId;
    }

    processedReports.push({
      reportDef: rep,
      observationId: obsId,
      incidentId: pipelineResult.incidentId,
      action: pipelineResult.action,
      status: pipelineResult.status,
      category: updatedObs?.category,
      severity: updatedObs?.severity,
    });
  }

  // 4. Verification and Summary
  console.log(`\n${YELLOW}[Step 3/3] Verifying incident formation & correlation integrity...${RESET}`);

  if (!primaryIncidentId) {
    console.error(`  ${RED}✗ Primary Incident #1 was not created by Report 1!${RESET}`);
    process.exit(1);
  }

  // Fetch final Incident #1 state
  const { data: inc1 } = await supabase
    .from("incidents")
    .select("*")
    .eq("id", primaryIncidentId)
    .single();

  const { data: inc1Obs } = await supabase
    .from("observations")
    .select("id, location_label, raw_text")
    .eq("incident_id", primaryIncidentId);

  const { data: linkDecisions } = await supabase
    .from("link_decisions")
    .select("*")
    .eq("candidate_incident_id", primaryIncidentId);

  const { data: events } = await supabase
    .from("incident_events")
    .select("type, note, created_at")
    .eq("incident_id", primaryIncidentId)
    .order("created_at", { ascending: true });

  console.log(`\n${CYAN}================================================================${RESET}`);
  console.log(`${CYAN}${BOLD}                  INCIDENT #1 VERIFICATION                      ${RESET}`);
  console.log(`${CYAN}================================================================${RESET}`);
  console.log(`  ID:                 ${inc1?.id}`);
  console.log(`  Title:              ${inc1?.title}`);
  console.log(`  Category:           ${inc1?.category}`);
  console.log(`  Severity:           ${inc1?.severity}`);
  console.log(`  Observation Count:  ${BOLD}${inc1?.observation_count}${RESET} (Expected: 4)`);
  console.log(`  AI Summary:         "${inc1?.summary}"`);
  console.log(`  Linked Observations:${inc1Obs?.length} observations`);
  console.log(`  Explainability Logs:${linkDecisions?.length} decisions recorded in link_decisions`);
  console.log(`  Timeline Events:    ${events?.length} audit events in incident_events`);

  console.log(`\n${BOLD}Decoy Segregation Check:${RESET}`);
  const decoyReports = processedReports.filter((r) => !r.reportDef.isRelated);
  let decoysSafelyIsolated = true;

  for (const decoy of decoyReports) {
    const isMergedIntoInc1 = decoy.incidentId === primaryIncidentId;
    if (isMergedIntoInc1) {
      console.error(`  ${RED}✗ FAIL:${RESET} Decoy ${decoy.reportDef.titleKey} incorrectly merged into Incident #1!`);
      decoysSafelyIsolated = false;
    } else {
      console.log(`  ${GREEN}✓ SAFE:${RESET} ${decoy.reportDef.titleKey} created separate incident (${decoy.incidentId})`);
    }
  }

  const relatedReports = processedReports.filter((r) => r.reportDef.isRelated);
  const relatedMergedCount = relatedReports.filter((r) => r.incidentId === primaryIncidentId).length;

  console.log(`\n${CYAN}================================================================${RESET}`);
  if (relatedMergedCount === 4 && decoysSafelyIsolated) {
    console.log(`${GREEN}${BOLD}✓ ALL SEED VERIFICATIONS PASSED!${RESET}`);
    console.log(`${GREEN}  Incident #1 genuinely formed with all 4 reports merged by Gemma 4.${RESET}`);
    console.log(`${GREEN}  All 4 decoys correctly isolated into separate incident clusters.${RESET}`);
    console.log(`  View incident in browser at: ${CYAN}http://localhost:3000/dashboard/incidents/${primaryIncidentId}${RESET}`);
  } else {
    console.log(`${YELLOW}⚠ Partial formation:${RESET} ${relatedMergedCount}/4 related merged into Incident #1.`);
  }
  console.log(`${CYAN}================================================================${RESET}\n`);
}

main().catch((err) => {
  console.error("Seed execution error:", err);
  process.exit(1);
});
