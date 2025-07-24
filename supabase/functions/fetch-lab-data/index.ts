import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getGoogleAccessToken } from "../_shared/google-auth.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const SPREADSHEET_ID = '1y4NERxj3AKZ3QdGV6srGE5U0mm1f1W0VXXP6TyCZ9Ec';
async function fetchSheetData(accessToken, sheetName) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(sheetName)}!A:Z`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to fetch sheet ${sheetName}:`, errorText);
    return null;
  }
  const data = await response.json();
  return data.values || [];
}
function parseBaseSheetRow(row, headers) {
  if (!row || row.length === 0) return null;
  const medicine = {};
  headers.forEach((header, index)=>{
    const value = row[index] || '';
    const lowerHeader = header.toLowerCase().trim();
    if (lowerHeader === 'test name') {
      medicine.name = value;
    } else if (lowerHeader === 'id') {
      medicine.id = value;
    } else if (lowerHeader === 'our cost') {
      medicine.originalPrice = parseFloat(value.toString().replace(/[^\d.]/g, '')) || 0;
    } else if (lowerHeader === 'lab rate') {
      medicine.price = parseFloat(value.toString().replace(/[^\d.]/g, '')) || 0;
    } else if (lowerHeader === 'mrp') {
      medicine.marketPrice = parseFloat(value.toString().replace(/[^\d.]/g, '')) || 0;
    } else if (lowerHeader === 'profit %') {
      medicine.discount = parseFloat(value) || 0;
    }
  });
  if (!medicine.name || medicine.name.trim() === '') return null;
  return medicine;
}
const handler = async (req)=>{
  console.log('Fetching lab data from Google Sheets...');
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const accessToken = await getGoogleAccessToken();
    if (!accessToken) {
      console.error('Failed to get Google access token');
      return new Response(JSON.stringify({
        error: 'Failed to authenticate with Google'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    console.log('Successfully obtained access token, fetching sheet data...');
    // Fetch data from both sheets
    const [baseData] = await Promise.all([
      fetchSheetData(accessToken, 'tests')
    ]);
    const medicines = [];
    const medicineMap = new Map();
    // Process Base sheet first (primary data)
    if (baseData && baseData.length > 1) {
      const headers = baseData[0];
      console.log('Base sheet headers:', headers);
      for(let i = 1; i < baseData.length; i++){
        const medicine = parseBaseSheetRow(baseData[i], headers);
        if (medicine && medicine.name) {
          const completeMedicine = {
            id: medicine.id,
            name: medicine.name,
            price: medicine.price,
            originalPrice: medicine.originalPrice,
            marketPrice: medicine.marketPrice,
            discount: medicine.discount
          };
          medicineMap.set(medicine.name.toLowerCase(), completeMedicine);
        }
      }
    }
    // Convert map to array
    medicines.push(...medicineMap.values());
    console.log(`Successfully processed ${medicines.length} medicines`);
    return new Response(JSON.stringify({
      medicines
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Error in fetch-pharmacy-data function:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch pharmacy data'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
};
serve(handler);
