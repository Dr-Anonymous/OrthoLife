
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const { searchTerm, searchType } = await req.json()

  if (!searchTerm || !searchType) {
    return new Response(JSON.stringify({ error: 'searchTerm and searchType are required' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      },
    )

    let query = supabase.from('patients').select('*')

    if (searchType === 'name') {
      query = query.ilike('name', `%${searchTerm}%`)
    } else if (searchType === 'phone') {
      const sanitizedPhone = searchTerm.slice(-10)
      query = query.like('phone', `%${sanitizedPhone}%`)
    } else {
      return new Response(JSON.stringify({ error: 'Invalid searchType' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
