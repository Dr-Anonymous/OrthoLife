import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getGoogleAccessToken } from "../_shared/google-auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SPREADSHEET_ID = '1jKYd6tawgBeKO4ijqxg0dv38kBuV76mNHZYbqXWSMA4';

interface Medicine {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
  manufacturer?: string;
  dosage?: string;
  packSize?: string;
  prescriptionRequired?: boolean;
}

async function fetchSheetData(accessToken: string, sheetName: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(sheetName)}!A:Z`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to fetch sheet ${sheetName}:`, errorText);
    return null;
  }

  const data = await response.json();
  return data.values || [];
}

function parseRowToMedicine(row: string[], headers: string[]): Medicine | null {
  if (!row || row.length === 0) return null;
  
  const medicine: any = {
    id: row[0] || Math.random().toString(36).substr(2, 9),
    inStock: true, // default value
  };

  headers.forEach((header, index) => {
    const value = row[index] || '';
    const lowerHeader = header.toLowerCase();
    
    if (lowerHeader.includes('name') || lowerHeader.includes('medicine')) {
      medicine.name = value;
    } else if (lowerHeader.includes('description') || lowerHeader.includes('details')) {
      medicine.description = value;
    } else if (lowerHeader.includes('price') || lowerHeader.includes('cost')) {
      medicine.price = parseFloat(value.toString().replace(/[^\d.]/g, '')) || 0;
    } else if (lowerHeader.includes('category') || lowerHeader.includes('type')) {
      medicine.category = value;
    } else if (lowerHeader.includes('stock') || lowerHeader.includes('available')) {
      medicine.inStock = value.toLowerCase() !== 'no' && value.toLowerCase() !== 'false' && value !== '0';
    } else if (lowerHeader.includes('manufacturer') || lowerHeader.includes('brand')) {
      medicine.manufacturer = value;
    } else if (lowerHeader.includes('dosage') || lowerHeader.includes('strength')) {
      medicine.dosage = value;
    } else if (lowerHeader.includes('pack') || lowerHeader.includes('size') || lowerHeader.includes('quantity')) {
      medicine.packSize = value;
    } else if (lowerHeader.includes('prescription') || lowerHeader.includes('rx')) {
      medicine.prescriptionRequired = value.toLowerCase() === 'yes' || value.toLowerCase() === 'true';
    }
  });

  // Ensure required fields have values
  if (!medicine.name || medicine.name.trim() === '') return null;
  if (!medicine.description) medicine.description = `${medicine.name} - ${medicine.dosage || 'Standard dosage'}`;
  if (!medicine.category) medicine.category = 'General';
  if (medicine.price === 0) medicine.price = 100; // default price

  return medicine;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Fetching pharmacy data from Google Sheets...');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = await getGoogleAccessToken();
    if (!accessToken) {
      console.error('Failed to get Google access token');
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate with Google' }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    console.log('Successfully obtained access token, fetching sheet data...');

    // Fetch data from both sheets
    const [sheet1Data, sheet2Data] = await Promise.all([
      fetchSheetData(accessToken, 'Sheet1'),
      fetchSheetData(accessToken, 'Sheet2')
    ]);

    const medicines: Medicine[] = [];

    // Process Sheet1
    if (sheet1Data && sheet1Data.length > 1) {
      const headers = sheet1Data[0];
      console.log('Sheet1 headers:', headers);
      
      for (let i = 1; i < sheet1Data.length; i++) {
        const medicine = parseRowToMedicine(sheet1Data[i], headers);
        if (medicine) {
          medicines.push(medicine);
        }
      }
    }

    // Process Sheet2
    if (sheet2Data && sheet2Data.length > 1) {
      const headers = sheet2Data[0];
      console.log('Sheet2 headers:', headers);
      
      for (let i = 1; i < sheet2Data.length; i++) {
        const medicine = parseRowToMedicine(sheet2Data[i], headers);
        if (medicine) {
          medicines.push(medicine);
        }
      }
    }

    console.log(`Successfully processed ${medicines.length} medicines`);

    return new Response(
      JSON.stringify({ medicines }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );

  } catch (error) {
    console.error('Error in fetch-pharmacy-data function:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch pharmacy data' }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }
};

serve(handler);