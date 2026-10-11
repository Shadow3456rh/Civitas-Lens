import { getAdminClient } from "./src/lib/supabase/admin";

async function run() {
  const supabase = getAdminClient();
  console.log("Fixing missing profile...");
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: "939855b1-da7e-4cfb-975a-bd958e289aae", role: "citizen" });

  if (error) {
    console.error("Error inserting profile:", error);
  } else {
    console.log("Profile successfully inserted!");
  }
}

run().catch(console.error);
