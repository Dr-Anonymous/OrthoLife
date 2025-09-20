import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { id, price, stock_count, parentId } = await req.json();

    if (!id) {
      return new Response(JSON.stringify({ error: 'Medicine ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const updateData: { price?: number; stock_count?: number, in_stock?: boolean } = {};
    if (price !== undefined) {
      updateData.price = price;
    }
    if (stock_count !== undefined) {
      updateData.stock_count = stock_count;
      updateData.in_stock = stock_count > 0;
    }

    if (Object.keys(updateData).length === 0) {
        return new Response(JSON.stringify({ error: 'No fields to update' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
    }

    const { data: updatedMedicine, error } = await supabaseClient
      .from('medicines')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating medicine:', error);
      throw new Error('Failed to update medicine');
    }

    if (parentId && stock_count !== undefined) {
      // This is a variant, we need to update the parent's `sizes` array
      const { data: parent, error: parentError } = await supabaseClient
        .from('medicines')
        .select('sizes')
        .eq('id', parentId)
        .single();

      if (parentError) {
        console.error('Error fetching parent medicine:', parentError);
        throw new Error('Failed to update parent medicine');
      } else if (parent && parent.sizes) {
        const sizes = typeof parent.sizes === 'string' ? JSON.parse(parent.sizes) : parent.sizes;

        const variantIndex = sizes.findIndex((v: { id: string }) => v.id === id);
        if (variantIndex !== -1) {
          sizes[variantIndex].stockCount = stock_count;
          sizes[variantIndex].inStock = stock_count > 0;
        }

        const { error: updateParentError } = await supabaseClient
          .from('medicines')
          .update({ sizes: JSON.stringify(sizes) })
          .eq('id', parentId);

        if (updateParentError) {
          console.error('Error updating parent medicine sizes:', updateParentError);
          throw new Error('Failed to update parent medicine');
        }
      }
    }

    return new Response(JSON.stringify({ medicine: updatedMedicine }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('Error in update-medicine function:', error);
    return new Response(JSON.stringify({ error: 'Failed to update medicine' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

serve(handler);
