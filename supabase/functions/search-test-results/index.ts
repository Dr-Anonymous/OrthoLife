import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getGoogleAccessToken } from "../_shared/google-auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const GOOGLE_SHEET_ID = '1TLBWhhmWNHDhINguUlncvylmJQkVExoveDH3Z436v80';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    if (!query) {
      return new Response(JSON.stringify({ error: 'Search query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const accessToken = await getGoogleAccessToken();
    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Missing Google access token' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const sheetDataResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/Sheet1!A:J`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    const sheetData = await sheetDataResponse.json();
    const rows = sheetData.values || [];

    // Assuming the first row is the header
    const headers = rows[0];
    const data = rows.slice(1).map(row => {
      const rowData = {};
      headers.forEach((header, index) => {
        rowData[header] = row[index];
      });
      return rowData;
    });

    const filteredData = data.filter(item => item.phoneNumber === query);

    const groupedByPatient = filteredData.reduce((acc, current) => {
      const patientName = current.patientName;
      if (!acc[patientName]) {
        acc[patientName] = [];
      }
      acc[patientName].push(current);
      return acc;
    }, {});

    return new Response(JSON.stringify(groupedByPatient), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in search test results:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
