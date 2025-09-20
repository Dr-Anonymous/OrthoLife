import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getGoogleAccessToken } from "../_shared/google-auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const SPREADSHEET_ID = '1jKYd6tawgBeKO4ijqxg0dv38kBuV76mNHZYbqXWSMA4';

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

function extractBaseNameAndSize(name) {
  // Common size patterns to detect
  const sizePatterns = [
    /\s+(XS|S|M|L|XL|XXL|XXXL|EXTRA SMALL|SMALL|MEDIUM|LARGE|EXTRA LARGE)$/i,
    /\s+SIZE\s+(XS|S|M|L|XL|XXL|XXXL|\d+)$/i,
    /\s*-\s*(XS|S|M|L|XL|XXL|XXXL|SMALL|MEDIUM|LARGE)$/i,
    /\s+\((XS|S|M|L|XL|XXL|XXXL|SMALL|MEDIUM|LARGE)\)$/i
  ];

  for (const pattern of sizePatterns) {
    const match = name.match(pattern);
    if (match) {
      const baseName = name.replace(pattern, '').trim();
      const size = match[1].toUpperCase();
      
      // Normalize size names
      const normalizedSize = size === 'EXTRA SMALL' ? 'XS' : 
                           size === 'SMALL' ? 'S' : 
                           size === 'MEDIUM' ? 'M' : 
                           size === 'LARGE' ? 'L' : 
                           size === 'EXTRA LARGE' ? 'XL' : size;
      
      return { baseName, size: normalizedSize };
    }
  }
  
  return { baseName: name, size: null };
}

function parseBaseSheetRow(row, headers) {
  if (!row || row.length === 0) return null;
  
  const medicine = {};
  
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

function parseSupplierSheetRow(row, headers) {
  if (!row || row.length === 0) return null;
  
  const medicine = {};
  
  headers.forEach((header, index) => {
    const value = row[index] || '';
    const lowerHeader = header.toLowerCase().trim();
    
    if (lowerHeader === 'name') {
      medicine.name = value;
    } else if (lowerHeader === 'mrp') {
      medicine.originalPrice = parseFloat(value.toString().replace(/[^\d.]/g, '')) || 0;
    } else if (lowerHeader === 'final price') {
      medicine.price = parseFloat(value.toString().replace(/[^\d.]/g, '')) || 0;
    } else if (lowerHeader === 'stock') {
      const stockCount = parseInt(value) || 0;
      medicine.stockCount = stockCount;
      medicine.inStock = stockCount > 0;
    } else if (lowerHeader === 'discount %') {
      medicine.discount = parseFloat(value) || 0;
    } else if (lowerHeader === 'individual') {
      medicine.individual = value || true;
    }
  });

  if (!medicine.name || medicine.name.trim() === '') return null;
  
  return medicine;
}

const handler = async (req) => {
  console.log('Fetching pharmacy data from Google Sheets...');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = await getGoogleAccessToken();
    if (!accessToken) {
      console.error('Failed to get Google access token');
      return new Response(JSON.stringify({ error: 'Failed to authenticate with Google' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    console.log('Successfully obtained access token, fetching sheet data...');

    // Fetch data from both sheets
    const [baseData, supplier1Data] = await Promise.all([
      fetchSheetData(accessToken, 'Base'),
      fetchSheetData(accessToken, 'Supplier1')
    ]);

    const medicines = [];
    const medicineMap = new Map();

    // Process Base sheet first (primary data)
    if (baseData && baseData.length > 1) {
      const headers = baseData[0];
      console.log('Base sheet headers:', headers);
      
      for (let i = 1; i < baseData.length; i++) {
        const medicine = parseBaseSheetRow(baseData[i], headers);
        if (medicine && medicine.name) {
          const completeMedicine = {
            id: medicine.id,
            name: medicine.name,
            description: medicine.description || medicine.name,
            category: medicine.category, // FIX: Added missing category
            price: 0,
            inStock: false,
            packSize: medicine.packSize,
            prescriptionRequired: medicine.prescriptionRequired || false
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
            const mergedMedicine = {
              ...existingMedicine,
              price: supplierMedicine.price || 0,
              inStock: supplierMedicine.inStock || false,
              originalPrice: supplierMedicine.originalPrice || 0,
              stockCount: supplierMedicine.stockCount || 0,
              discount: supplierMedicine.discount || 0,
              individual: supplierMedicine.individual
            };
            medicineMap.set(key, mergedMedicine);
          }
        }
      }
    }

    // Group medicines by base name and price for size variants
    const groupedMedicines = new Map();
    const individualMedicines = [];

    for (const medicine of medicineMap.values()) {
      const { baseName, size } = extractBaseNameAndSize(medicine.name);
      
      if (size) {
        const groupKey = `${baseName}-${medicine.price}`;
        if (groupedMedicines.has(groupKey)) {
          const existingGroup = groupedMedicines.get(groupKey);
          existingGroup.sizes.push({
            size: size,
            stockCount: medicine.stockCount || 0,
            inStock: medicine.inStock || false,
            originalName: medicine.name,
            id: medicine.id
          });
        } else {
          groupedMedicines.set(groupKey, {
            id: medicine.id,
            name: baseName,
            description: medicine.description,
            category: medicine.category, // FIX: Ensure category is included
            price: medicine.price,
            inStock: medicine.inStock,
            packSize: medicine.packSize,
            prescriptionRequired: medicine.prescriptionRequired,
            originalPrice: medicine.originalPrice,
            discount: medicine.discount,
            isGrouped: true,
            sizes: [{
              size: size,
              stockCount: medicine.stockCount || 0,
              inStock: medicine.inStock || false,
              originalName: medicine.name,
              id: medicine.id
            }]
          });
        }
      } else {
        individualMedicines.push(medicine);
      }
    }

    // Convert grouped medicines and merge with individual medicines
    const finalGroupedMedicines = Array.from(groupedMedicines.values()).map(group => {
      // Sort sizes in logical order
      const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
      group.sizes.sort((a, b) => {
        const aIndex = sizeOrder.indexOf(a.size);
        const bIndex = sizeOrder.indexOf(b.size);
        if (aIndex === -1 && bIndex === -1) return a.size.localeCompare(b.size);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });

      // Update group stock status based on all sizes
      group.inStock = group.sizes.some(s => s.inStock);
      group.stockCount = group.sizes.reduce((total, s) => total + s.stockCount, 0);
      
      return group;
    });

    // Only create grouped items if they have multiple sizes
    const filteredGroupedMedicines = finalGroupedMedicines.filter(group => group.sizes.length > 1);
    
    const ungroupedSingleSizes = finalGroupedMedicines.filter(group => group.sizes.length === 1).map(group => {
      const sizeInfo = group.sizes[0];
      return {
        id: sizeInfo.id,
        name: sizeInfo.originalName,
        description: group.description,
        category: group.category,
        price: group.price,
        inStock: sizeInfo.inStock,
        packSize: group.packSize,
        prescriptionRequired: group.prescriptionRequired,
        originalPrice: group.originalPrice,
        stockCount: sizeInfo.stockCount,
        discount: group.discount
      };
    });

    medicines.push(...ungroupedSingleSizes, ...individualMedicines, ...filteredGroupedMedicines);

    console.log(`Successfully processed ${medicines.length} medicines (${filteredGroupedMedicines.length} grouped items)`);

    return new Response(JSON.stringify({ medicines }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error('Error in fetch-pharmacy-data function:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch pharmacy data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
};

serve(handler);
