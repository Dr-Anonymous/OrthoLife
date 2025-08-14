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
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(sheetName)}!A:I?fields=values`;
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
    else if (key === "description") medicine.description = value;
    else if (key === "category") medicine.category = value;
    else if (key === "lab rate") medicine.price = parseFloat(value) || 0;
    else if (key === "market rate") medicine.marketPrice = parseFloat(value) || 0;
    else if (key === "duration") medicine.duration = value;
  });
  return medicine.name ? medicine : null;
}
// Helper function to update a file on GitHub
async function updateGitHubFile(content: string, token: string) {
  const owner = 'Dr-Anonymous';
  const repo = 'OrthoLife';
  const path = 'public/lab-data.json';
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
  };

  let sha;
  try {
    const response = await fetch(apiUrl, { headers });
    if (response.ok) {
      const fileData = await response.json();
      sha = fileData.sha;
    } else if (response.status !== 404) {
      const errorBody = await response.text();
      throw new Error(`Failed to get file SHA: ${response.statusText}. Body: ${errorBody}`);
    }
  } catch (error) {
    console.error('Error getting file SHA:', error);
    // Don't throw, we can still try to create the file if it doesn't exist
  }

  // Deno's btoa is a web standard API. The unescape/encodeURIComponent is to handle unicode characters.
  const contentBase64 = btoa(unescape(encodeURIComponent(content)));

  const body = JSON.stringify({
    message: 'Update lab data',
    content: contentBase64,
    sha: sha, // if sha is undefined, GitHub API will create a new file
  });

  const updateResponse = await fetch(apiUrl, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body,
  });

  if (!updateResponse.ok) {
    const errorBody = await updateResponse.text();
    throw new Error(`Failed to update file on GitHub: ${updateResponse.statusText}. Body: ${errorBody}`);
  }

  console.log('✅ File updated on GitHub successfully');
}


serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  // This function is now only for refreshing the data file.
  // The `refresh=true` query param is implicitly handled by the fact that this function is called.
  
  try {
    console.log("🔄 Refresh requested, fetching fresh data from Google Sheets");
    
    // Fetch fresh data from Google Sheets
    const accessToken = await getGoogleAccessToken();
    const sheetData = await fetchSheetData(accessToken, "tests");
    const headersRow = sheetData[0] || [];
    const medicines = sheetData.slice(1).map((row)=>parseBaseSheetRow(row, headersRow)).filter(Boolean);
    
    const fileContent = JSON.stringify({ medicines }, null, 2);

    // Update file on GitHub
    const githubToken = Deno.env.get("GITHUB_TOKEN");
    if (!githubToken) {
      console.error("❌ GITHUB_TOKEN environment variable not set");
      throw new Error("GITHUB_TOKEN environment variable not set");
    }
    await updateGitHubFile(fileContent, githubToken);

    return new Response(JSON.stringify({
      message: "Lab data refreshed successfully."
    }), {
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (err) {
    console.error("❌ Error:", err.message);
    return new Response(JSON.stringify({
      error: "Failed to fetch and update lab data",
      details: err.message,
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
});
