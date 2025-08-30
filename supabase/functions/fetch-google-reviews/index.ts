
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const placeId = 'ChIJT6k-_1soODoRmW1kWN7Fa2E'

export async function handleRequest(req: Request, supabaseClient: SupabaseClient) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Check for cached data first
    const { data: cachedData, error: cacheError } = await supabaseClient
      .from('google_reviews_cache')
      .select('reviews_data, cached_at')
      .eq('place_id', placeId)
      .single()

    if (cacheError) {
      console.error('Error fetching from cache:', cacheError.message)
    }

    if (cachedData) {
      const cacheDate = new Date(cachedData.cached_at)
      const now = new Date()
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000

      if (now.getTime() - cacheDate.getTime() < thirtyDaysInMs) {
        console.log('Returning cached Google reviews')
        return new Response(JSON.stringify(cachedData.reviews_data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    console.log('Fetching fresh Google reviews')
    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY')
    if (!apiKey) {
      throw new Error('Google Places API key not configured')
    }

    // Fetch place details including reviews
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,reviews&key=${apiKey}`
    )

    if (!response.ok) {
      throw new Error(`Google API request failed: ${response.status}`)
    }

    const data = await response.json()

    if (data.status !== 'OK') {
      throw new Error(`Google API error: ${data.status}`)
    }

    const placeDetails = data.result
    const reviews = placeDetails.reviews || []

    // Format the reviews for frontend consumption
    const formattedReviews = reviews.map((review: any) => ({
      id: review.time.toString(),
      author: review.author_name,
      rating: review.rating,
      text: review.text,
      date: new Date(review.time * 1000).toISOString(),
      profilePhoto: review.profile_photo_url,
    }))

    const reviewsData = {
      businessName: placeDetails.name,
      overallRating: placeDetails.rating,
      totalReviews: placeDetails.user_ratings_total,
      reviews: formattedReviews,
    }

    // Upsert the new data into the cache
    const { error: upsertError } = await supabaseClient
      .from('google_reviews_cache')
      .upsert({
        place_id: placeId,
        reviews_data: reviewsData,
        cached_at: new Date().toISOString(),
      })

    if (upsertError) {
      console.error('Error caching Google reviews:', upsertError.message)
    }

    return new Response(JSON.stringify(reviewsData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error fetching Google reviews:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}

serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
  return await handleRequest(req, supabaseClient)
})
