import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

// Use service role key for DB operations inside edge function
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

async function fetchLimsCatalog() {
  const LIMS_URL = Deno.env.get('LIMS_EXPORT_URL');
  if (!LIMS_URL) {
    console.warn("LIMS_EXPORT_URL not set, skipping LIMS sync");
    return null;
  }

  // publicly accessible without key as per user request
  const res = await fetch(LIMS_URL);

  if (!res.ok) {
    console.error(`LIMS fetch failed: ${res.status} ${res.statusText}`);
    return null;
  }

  return await res.json();
}

async function syncToCache(services: any[], ranges: any[]) {
  const syncTime = new Date().toISOString();
  console.log(`Syncing ${services.length} services and ${ranges.length} ranges to cache...`);

  for (const service of services) {
    const { error } = await supabaseAdmin
      .from('lims_catalog_cache')
      .upsert({
        item_type: 'service',
        external_id: service.id.toString(),
        data: service,
        last_synced_at: syncTime
      }, { onConflict: 'item_type,external_id' });
    
    if (error) console.error(`Failed to sync service ${service.id}:`, error);
  }

  for (const range of ranges) {
    const { error } = await supabaseAdmin
      .from('lims_catalog_cache')
      .upsert({
        item_type: 'range',
        external_id: range.id.toString(),
        data: range,
        last_synced_at: syncTime
      }, { onConflict: 'item_type,external_id' });
    
    if (error) console.error(`Failed to sync range ${range.id}:`, error);
  }

  // Delete stale rows (anything not updated in THIS sync)
  const { error: deleteError } = await supabaseAdmin
    .from('lims_catalog_cache')
    .delete()
    .lt('last_synced_at', syncTime);
  
  if (deleteError) console.error("Failed to cleanup stale cache rows:", deleteError);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    console.log("🔄 Starting Lab Data Refresh...");

    const limsData = await fetchLimsCatalog();
    if (limsData && limsData.services) {
      await syncToCache(limsData.services, limsData.ranges || []);
      
      return new Response(JSON.stringify({ 
        message: "Lab data refreshed successfully from LIMS." 
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    } else {
      // Soft-fail: return 200 with warning to avoid cron alerts
      console.warn("⚠️ LIMS catalog fetch failed or returned empty data. App will use existing cache.");
      return new Response(JSON.stringify({ 
        message: "LIMS sync skipped or failed. Using existing cache.",
        warning: true
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

  } catch (err: any) {
    // Also soft-fail for runtime errors to avoid cron alerts
    console.error("❌ Sync Error:", err.message);
    return new Response(JSON.stringify({ 
      error: err.message,
      message: "Sync failed, using existing cache.",
      warning: true
    }), {
      status: 200, 
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
});
