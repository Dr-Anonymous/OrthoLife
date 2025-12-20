import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch all items with their inventory
    const { data: items, error } = await supabase
      .from('pharmacy_items')
      .select(`
        *,
        pharmacy_inventory (
          sale_price,
          original_price,
          stock,
          discount_percentage,
          is_individual
        )
      `);

    if (error) throw error;

    const medicines = [];
    const groupedMedicines = new Map();
    const individualMedicines = [];

    for (const item of items) {
      // Flatten the structure
      let inventory = {};
      if (Array.isArray(item.pharmacy_inventory)) {
        inventory = item.pharmacy_inventory[0] || {};
      } else if (item.pharmacy_inventory) {
        inventory = item.pharmacy_inventory;
      }

      const medicine = {
        id: item.id,
        name: item.name,
        description: item.description || item.name,
        category: item.category,
        price: Number(inventory.sale_price) || 0,
        inStock: (inventory.stock || 0) > 0,
        stockCount: inventory.stock || 0,
        packSize: item.pack_size,
        prescriptionRequired: item.prescription_required,
        originalPrice: Number(inventory.original_price) || 0,
        discount: Number(inventory.discount_percentage) || 0,
        individual: inventory.is_individual || false
      };

      const { baseName, size } = extractBaseNameAndSize(medicine.name);

      if (size) {
        const groupKey = `${baseName}-${medicine.price}`;
        if (groupedMedicines.has(groupKey)) {
          const existingGroup = groupedMedicines.get(groupKey);
          existingGroup.sizes.push({
            size: size,
            stockCount: medicine.stockCount,
            inStock: medicine.inStock,
            originalName: medicine.name,
            id: medicine.id
          });
        } else {
          groupedMedicines.set(groupKey, {
            id: medicine.id, // Use the first item's ID as group ID
            name: baseName,
            description: medicine.description,
            category: medicine.category,
            price: medicine.price,
            inStock: medicine.inStock,
            packSize: medicine.packSize,
            prescriptionRequired: medicine.prescriptionRequired,
            originalPrice: medicine.originalPrice,
            discount: medicine.discount,
            isGrouped: true,
            sizes: [{
              size: size,
              stockCount: medicine.stockCount,
              inStock: medicine.inStock,
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
        discount: group.discount,
        individual: true // Default to true for single items
      };
    });

    medicines.push(...ungroupedSingleSizes, ...individualMedicines, ...filteredGroupedMedicines);

    return new Response(JSON.stringify({ medicines }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error('Error fetching pharmacy data:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch pharmacy data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});
