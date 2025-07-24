import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getGoogleAccessToken } from "../_shared/google-auth.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
const SPREADSHEET_ID = "1y4NERxj3AKZ3QdGV6srGE5U0mm1f1W0VXXP6TyCZ9Ec";
const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_ANON_KEY"), {
  global: {
    headers: {
      Authorization: (req)=>req.headers.get("authorization")
    }
  }
});
async function fetchSheetData(accessToken, sheetName) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(sheetName)}!A:G?fields=values`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!res.ok) {
    console.error(`Google Sheets fetch failed:`, await res.text());
    throw new Error("Failed to fetch data from Google Sheets");
  }
  const json = await res.json();
  return json.values;
}
function parseBaseSheetRow(row, headers) {
  const medicine = {};
  headers.forEach((header, i)=>{
    const key = header.toLowerCase().trim();
    const value = row[i] || "";
    if (key === "id") medicine.id = value;
    else if (key === "test name") medicine.name = value;
    else if (key === "our cost") medicine.originalPrice = parseFloat(value) || 0;
    else if (key === "lab rate") medicine.price = parseFloat(value) || 0;
    else if (key === "mrp") medicine.marketPrice = parseFloat(value) || 0;
    else if (key === "profit %") medicine.discount = parseFloat(value) || 0;
  });
  return medicine.name ? medicine : null;
}
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  const { searchParams } = new URL(req.url);
  const forceRefresh = searchParams.get("refresh") === "true";
  console.log("forceRefresh:", forceRefresh);
  try {
    if (!forceRefresh) {
      // Try serving from DB cache
      const { data: cached, error } = await supabase.from("pharmacy_cache").select("data").eq("key", "medicines").single();
      if (cached?.data && !error) {
        console.log("✅ Serving from DB cache");
        return new Response(JSON.stringify({
          medicines: cached.data
        }), {
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        });
      }
      console.log("ℹ️ Cache miss or error, fetching fresh");
    } else {
      console.log("🔄 Force refresh requested, fetching fresh");
    }
    // Fetch fresh data from Google Sheets
    const accessToken = await getGoogleAccessToken();
    const sheetData = await fetchSheetData(accessToken, "tests");
    const headersRow = sheetData[0] || [];
    const medicines = sheetData.slice(1).map((row)=>parseBaseSheetRow(row, headersRow)).filter(Boolean);
    // Update cache in background
    supabase.from("pharmacy_cache").upsert({
      key: "medicines",
      data: medicines
    }).then(()=>console.log("✅ Cache updated")).catch((e)=>console.error("❌ Cache update failed:", e));
    return new Response(JSON.stringify({
      medicines
    }), {
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (err) {
    console.error("❌ Error:", err);
    return new Response(JSON.stringify({
      error: "Failed to fetch pharmacy data"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
});
