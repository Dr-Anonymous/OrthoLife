import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to convert snake_case to camelCase
const toCamelCase = (str: string) => {
  return str.replace(/([-_][a-z])/ig, ($1) => {
    return $1.toUpperCase()
      .replace('-', '')
      .replace('_', '');
  });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const snakeToCamel = (obj: any): any => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  return Object.keys(obj).reduce((acc, key) => {
    const camelKey = toCamelCase(key);
    let value = obj[key];
    if (key === 'sizes' && typeof value === 'string') {
      try {
        value = JSON.parse(value);
      } catch (e) {
        console.error('Error parsing sizes JSON:', e);
      }
    }
    acc[camelKey] = value;
    return acc;
  }, {} as any);
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

    const { page = 1, search = '', fetchAll = false } = await req.json();
    const limit = 20;
    const offset = (page - 1) * limit;

    let query = supabaseClient.from('medicines').select('*', { count: 'exact' });

    if (search) {
      query = query.or(`name.ilike.%${search}%,category.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (!fetchAll) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching medicines:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch medicines' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const processedMedicines = data.map(med => snakeToCamel(med));

    return new Response(JSON.stringify({
      medicines: processedMedicines,
      total: count,
      page,
      limit,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('Error in get-medicines function:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch medicines' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

serve(handler);
