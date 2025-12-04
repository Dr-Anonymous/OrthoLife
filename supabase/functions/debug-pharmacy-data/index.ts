import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Check counts
        const { count: itemsCount, error: itemsError } = await supabase
            .from('pharmacy_items')
            .select('*', { count: 'exact', head: true });

        const { count: inventoryCount, error: inventoryError } = await supabase
            .from('pharmacy_inventory')
            .select('*', { count: 'exact', head: true });

        // Fetch sample data
        const { data: sampleItems, error: sampleError } = await supabase
            .from('pharmacy_items')
            .select(`
        id,
        name,
        pharmacy_inventory (
          item_id,
          sale_price,
          stock
        )
      `)
            .limit(5);

        return new Response(JSON.stringify({
            itemsCount,
            inventoryCount,
            itemsError,
            inventoryError,
            sampleItems,
            sampleError
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
});
