import { getAdminClient } from "./src/lib/supabase/admin";
import { processObservation } from "./src/lib/pipeline/process";

async function run() {
  const supabase = getAdminClient();
  const { data: stuck } = await supabase
    .from("observations")
    .select("id")
    .in("processing_status", ["pending", "failed", "needs_review"]);

  if (!stuck || stuck.length === 0) {
    console.log("No stuck observations found!");
    return;
  }

  console.log(`Found ${stuck.length} stuck observations, processing...`);
  
  for (const obs of stuck) {
    console.log(`Processing ${obs.id}...`);
    try {
      const result = await processObservation(obs.id);
      console.log(`Result for ${obs.id}:`, result.action);
    } catch (e) {
      console.error(`Failed on ${obs.id}:`, e);
    }
  }
}

run().catch(console.error);
