import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
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
        } else if (lowerHeader === 'discount %') {
            medicine.discount = parseFloat(value) || 0;
        } else if (lowerHeader === 'individual') {
            medicine.individual = (value && value.toLowerCase() === 'true') || false;
        }
    });

    if (!medicine.name || medicine.name.trim() === '') return null;

    return medicine;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const accessToken = await getGoogleAccessToken();
        if (!accessToken) {
            throw new Error('Failed to get Google access token');
        }

        // Fetch data from both sheets
        const [baseData, supplier1Data] = await Promise.all([
            fetchSheetData(accessToken, 'Base'),
            fetchSheetData(accessToken, 'Supplier1')
        ]);

        const itemsToInsert = [];
        const inventoryToInsert = [];
        const medicineMap = new Map();

        // Process Base sheet
        if (baseData && baseData.length > 1) {
            const headers = baseData[0];
            for (let i = 1; i < baseData.length; i++) {
                const medicine = parseBaseSheetRow(baseData[i], headers);
                if (medicine && medicine.name) {
                    medicineMap.set(medicine.name.toLowerCase(), medicine);
                }
            }
        }

        // Process Supplier1 sheet and prepare inserts
        if (supplier1Data && supplier1Data.length > 1) {
            const headers = supplier1Data[0];
            for (let i = 1; i < supplier1Data.length; i++) {
                const supplierMedicine = parseSupplierSheetRow(supplier1Data[i], headers);
                if (supplierMedicine && supplierMedicine.name) {
                    const key = supplierMedicine.name.toLowerCase();
                    const baseMedicine = medicineMap.get(key);

                    if (baseMedicine) {
                        // Check if item already exists in DB to avoid duplicates (optional, but good for re-runs)
                        // For now we assume clean slate or upsert logic if needed, but simple insert is requested.
                        // Actually, let's just prepare the data.

                        // We need to insert item first to get ID, but since we can't easily do that in batch without multiple round trips
                        // or a stored procedure, we will do it in a loop for simplicity as this is a one-time script.
                        // OR we can upsert items based on name and return IDs.

                        const { data: itemData, error: itemError } = await supabase
                            .from('pharmacy_items')
                            .upsert({
                                name: baseMedicine.name,
                                category: baseMedicine.category,
                                description: baseMedicine.description,
                                pack_size: baseMedicine.packSize,
                                prescription_required: baseMedicine.prescriptionRequired
                            }, { onConflict: 'name' })
                            .select('id')
                            .single();

                        if (itemError) {
                            console.error(`Error upserting item ${baseMedicine.name}:`, itemError);
                            continue;
                        }

                        if (itemData) {
                            const { error: inventoryError } = await supabase
                                .from('pharmacy_inventory')
                                .upsert({
                                    item_id: itemData.id,
                                    sale_price: supplierMedicine.price,
                                    original_price: supplierMedicine.originalPrice,
                                    stock: supplierMedicine.stockCount,
                                    discount_percentage: supplierMedicine.discount,
                                    is_individual: supplierMedicine.individual
                                }, { onConflict: 'item_id' });

                            if (inventoryError) {
                                console.error(`Error upserting inventory for ${baseMedicine.name}:`, inventoryError);
                            }
                        }
                    }
                }
            }
        }

        return new Response(
            JSON.stringify({ success: true, message: 'Migration completed' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
});
