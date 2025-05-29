
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY')
    if (!apiKey) {
      throw new Error('Google Places API key not configured')
    }

    const placeId = 'ChIJJT3ZgSUpODoRsyD-GOZ2YYg'
    
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
      profilePhoto: review.profile_photo_url
    }))

    const reviewsData = {
      businessName: placeDetails.name,
      overallRating: placeDetails.rating,
      totalReviews: placeDetails.user_ratings_total,
      reviews: formattedReviews
    }

    return new Response(
      JSON.stringify(reviewsData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error fetching Google reviews:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
