import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  console.log('Update pharmacy stock function called');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { items } = await req.json();

    if (!items || !Array.isArray(items)) {
      return new Response(JSON.stringify({ error: 'Invalid items data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const updates = [];
    const errors = [];

    for (const item of items) {
      try {
        // Calculate quantity to decrement
        let quantityToDecrement = item.quantity;
        if (item.orderType === 'unit' && item.packSize && item.packSize > 0) {
          quantityToDecrement = Math.ceil(item.quantity / item.packSize);
        }

        // Find the item by name
        const { data: pharmacyItem, error: itemError } = await supabase
          .from('pharmacy_items')
          .select('id')
          .eq('name', item.name) // nameForStockUpdate from frontend matches DB name
          .single();

        if (itemError || !pharmacyItem) {
          console.warn(`Item not found: ${item.name}`);
          errors.push(`Item not found: ${item.name}`);
          continue;
        }

        // Update inventory
        // We use a stored procedure or just a direct update. 
        // Since we need to decrement, we should fetch current stock first or use an RPC.
        // For simplicity, let's fetch and update, but RPC is better for concurrency.
        // Let's stick to simple fetch-update for now as per original logic, 
        // or better, use a simple decrement logic if possible.
        // Supabase doesn't have a direct 'decrement' in JS client without RPC.
        // So I will fetch current stock and update.

        const { data: inventory, error: inventoryError } = await supabase
          .from('pharmacy_inventory')
          .select('stock')
          .eq('item_id', pharmacyItem.id)
          .single();

        if (inventoryError || !inventory) {
          console.warn(`Inventory not found for item: ${item.name}`);
          errors.push(`Inventory not found for item: ${item.name}`);
          continue;
        }

        const newStock = Math.max(0, inventory.stock - quantityToDecrement);

        const { error: updateError } = await supabase
          .from('pharmacy_inventory')
          .update({ stock: newStock })
          .eq('item_id', pharmacyItem.id);

        if (updateError) {
          console.error(`Failed to update stock for ${item.name}:`, updateError);
          errors.push(`Failed to update stock for ${item.name}`);
        } else {
          updates.push({ name: item.name, previous: inventory.stock, new: newStock });
        }

      } catch (err) {
        console.error(`Error processing item ${item.name}:`, err);
        errors.push(`Error processing item ${item.name}`);
      }
    }

    console.log(`Updated stock for ${updates.length} items`);

    return new Response(JSON.stringify({
      success: true,
      updates,
      errors: errors.length > 0 ? errors : undefined
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error('Error updating stock:', error);
    return new Response(JSON.stringify({
      error: 'Failed to update stock',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});
