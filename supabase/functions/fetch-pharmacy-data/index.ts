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
  originalPrice?: number;
  stockCount?: number;
  discount?: number;
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

function parseBaseSheetRow(row: string[], headers: string[]): Partial<Medicine> | null {
  if (!row || row.length === 0) return null;
  
  const medicine: any = {};
  
  headers.forEach((header, index) => {
    const value = row[index] || '';
    const lowerHeader = header.toLowerCase().trim();
    
    if (lowerHeader === 'item id') {
      medicine.id = value;
    } else if (lowerHeader === 'type') {
      medicine.category = value;
    } else if (lowerHeader === 'name') {
      medicine.name = value;
    } else if (lowerHeader === 'qty/unit') {
      medicine.packSize = value;
    } else if (lowerHeader === 'control') {
      medicine.prescriptionRequired = value.toLowerCase() === 'prescription';
    } else if (lowerHeader === 'notes') {
      medicine.description = value;
    }
  });

  if (!medicine.name || medicine.name.trim() === '') return null;
  
  // Set defaults
  if (!medicine.id) medicine.id = Math.random().toString(36).substr(2, 9);
  if (!medicine.description) medicine.description = medicine.name;
  if (!medicine.category) medicine.category = 'General';
  
  return medicine;
}

function parseSupplierSheetRow(row: string[], headers: string[]): Partial<Medicine> | null {
  if (!row || row.length === 0) return null;
  
  const medicine: any = {};
  
  headers.forEach((header, index) => {
    const value = row[index] || '';
    const lowerHeader = header.toLowerCase().trim();
    
    if (lowerHeader === 'name') {
      medicine.name = value;
    } else if (lowerHeader === 'mrp') {
      medicine.originalPrice = parseFloat(value.toString().replace(/[^\d.]/g, '')) || 0;
    } else if (lowerHeader === 'final price') {
      medicine.price = parseFloat(value.toString().replace(/[^\d.]/g, '')) || 0;
    } else if (lowerHeader === 'available') {
      // Checkbox values might be TRUE/FALSE or other formats
      medicine.inStock = value.toLowerCase() === 'true' || value === '✓' || value === 'yes' || value === '1';
    } else if (lowerHeader === 'stock') {
      const stockCount = parseInt(value) || 0;
      medicine.stockCount = stockCount;
      medicine.inStock = stockCount > 0;
    } else if (lowerHeader === 'discount %') {
      medicine.discount = parseFloat(value) || 0;
    }
  });

  if (!medicine.name || medicine.name.trim() === '') return null;
  
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
    const [baseData, supplier1Data] = await Promise.all([
      fetchSheetData(accessToken, 'Base'),
      fetchSheetData(accessToken, 'Supplier1')
    ]);

    const medicines: Medicine[] = [];
    const medicineMap = new Map<string, Medicine>();

    // Process Base sheet first (primary data)
    if (baseData && baseData.length > 1) {
      const headers = baseData[0];
      console.log('Base sheet headers:', headers);
      
      for (let i = 1; i < baseData.length; i++) {
        const medicine = parseBaseSheetRow(baseData[i], headers);
        if (medicine && medicine.name) {
          const completeMedicine: Medicine = {
            id: medicine.id || Math.random().toString(36).substr(2, 9),
            name: medicine.name,
            description: medicine.description || medicine.name,
            price: 0, // Will be set from supplier data
            category: medicine.category || 'General',
            inStock: false, // Will be set from supplier data
            packSize: medicine.packSize,
            prescriptionRequired: medicine.prescriptionRequired || false,
            originalPrice: 0,
            stockCount: 0,
            discount: 0
          };
          medicineMap.set(medicine.name.toLowerCase(), completeMedicine);
        }
      }
    }

    // Process Supplier1 sheet (merge with base data)
    if (supplier1Data && supplier1Data.length > 1) {
      const headers = supplier1Data[0];
      console.log('Supplier1 sheet headers:', headers);
      
      for (let i = 1; i < supplier1Data.length; i++) {
        const supplierMedicine = parseSupplierSheetRow(supplier1Data[i], headers);
        if (supplierMedicine && supplierMedicine.name) {
          const key = supplierMedicine.name.toLowerCase();
          const existingMedicine = medicineMap.get(key);
          
          if (existingMedicine) {
            // Merge supplier data with base data
            const mergedMedicine: Medicine = {
              ...existingMedicine,
              price: supplierMedicine.price || 0,
              inStock: supplierMedicine.inStock || false,
              originalPrice: supplierMedicine.originalPrice || 0,
              stockCount: supplierMedicine.stockCount || 0,
              discount: supplierMedicine.discount || 0
            };
            medicineMap.set(key, mergedMedicine);
          }
        }
      }
    }

    // Convert map to array
    medicines.push(...medicineMap.values());

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