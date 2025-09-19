import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getGoogleAccessToken } from "../_shared/google-auth.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const SPREADSHEET_ID = '1jKYd6tawgBeKO4ijqxg0dv38kBuV76mNHZYbqXWSMA4';
async function updateStockInSheet(accessToken, stockUpdates) {
  // First, fetch current data to find the rows to update
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Supplier1!A:Z`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet data: ${response.statusText}`);
  }
  const data = await response.json();
  const values = data.values || [];
  if (values.length < 2) {
    throw new Error('Sheet does not have enough data');
  }
  const headers = values[0];
  const nameIndex = headers.findIndex((h)=>h.toLowerCase().trim() === 'name');
  const stockIndex = headers.findIndex((h)=>h.toLowerCase().trim() === 'stock');
  if (nameIndex === -1 || stockIndex === -1) {
    throw new Error('Name or Stock column not found in sheet');
  }
  // Prepare batch update requests
  const batchUpdateData = [];
  for (const update of stockUpdates){
    // Find the row for this medicine
    const rowIndex = values.findIndex((row, index)=>index > 0 && row[nameIndex]?.toLowerCase().trim() === update.name.toLowerCase().trim());
    if (rowIndex !== -1) {
      const currentStock = parseInt(values[rowIndex][stockIndex]) || 0;

      let quantityToDecrement = update.quantity;
      if (update.orderType === 'unit' && update.packSize && update.packSize > 0) {
        quantityToDecrement = Math.ceil(update.quantity / update.packSize);
      }

      const newStock = Math.max(0, currentStock - quantityToDecrement);
      // Add to batch update
      batchUpdateData.push({
        range: `Supplier1!${String.fromCharCode(65 + stockIndex)}${rowIndex + 1}`,
        values: [
          [
            newStock.toString()
          ]
        ]
      });
      console.log(`Updating ${update.name}: ${currentStock} -> ${newStock} (reduced by ${quantityToDecrement} packs)`);
    } else {
      console.warn(`Medicine not found in sheet: ${update.name}`);
    }
  }
  if (batchUpdateData.length === 0) {
    console.log('No stock updates to perform');
    return;
  }
  // Perform batch update
  const batchUpdateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchUpdate`;
  const batchResponse = await fetch(batchUpdateUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      valueInputOption: 'RAW',
      data: batchUpdateData
    })
  });
  if (!batchResponse.ok) {
    const errorText = await batchResponse.text();
    throw new Error(`Failed to update stock: ${errorText}`);
  }
  console.log(`Successfully updated stock for ${batchUpdateData.length} medicines`);
}
const handler = async (req)=>{
  console.log('Update pharmacy stock function called');
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const { items } = await req.json();
    if (!items || !Array.isArray(items)) {
      return new Response(JSON.stringify({
        error: 'Invalid items data'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    const stockUpdates = items.map((item)=>({
        name: item.name,
        quantity: item.quantity,
        orderType: item.orderType,
        packSize: item.packSize
      }));
    const accessToken = await getGoogleAccessToken();
    if (!accessToken) {
      throw new Error('Failed to get Google access token');
    }
    await updateStockInSheet(accessToken, stockUpdates);
    return new Response(JSON.stringify({
      success: true
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Error updating stock:', error);
    return new Response(JSON.stringify({
      error: 'Failed to update stock',
      details: error.message
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
