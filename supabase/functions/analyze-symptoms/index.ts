import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symptoms, age, gender, duration } = await req.json();
    
    if (!symptoms || symptoms.length === 0) {
      return new Response(JSON.stringify({ error: 'Symptoms are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const systemPrompt = `You are an experienced medical AI assistant providing preliminary symptom analysis for an orthopedic clinic. 

IMPORTANT DISCLAIMERS:
- This is NOT a replacement for professional medical diagnosis
- Always recommend consulting a qualified healthcare provider
- In case of emergency symptoms, advise immediate medical attention

Provide a helpful, clear analysis that includes:
1. Possible conditions (with likelihood: high/medium/low)
2. Recommended actions (see doctor urgently, schedule appointment, home care)
3. Warning signs to watch for
4. General care tips

Be empathetic, clear, and medically responsible. Focus on orthopedic and musculoskeletal conditions when relevant.`;

    const userPrompt = `Patient Information:
Age: ${age || 'Not provided'}
Gender: ${gender || 'Not provided'}
Duration: ${duration || 'Not provided'}

Symptoms: ${symptoms.join(', ')}

Please provide a preliminary analysis with possible conditions, recommended actions, warning signs, and care tips.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: systemPrompt }] },
          { parts: [{ text: userPrompt }] }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'AI analysis failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    const analysis = data.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ analysis }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in analyze-symptoms function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
