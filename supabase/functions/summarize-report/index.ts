import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { getGoogleAccessToken } from "../_shared/google-auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileContent, fileId, mimeType } = await req.json();
    
    let base64Data = '';
    let finalMimeType = mimeType;

    if (fileId) {
        // Fetch from Google Drive
        const accessToken = await getGoogleAccessToken();
        const driveResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!driveResponse.ok) {
            throw new Error(`Failed to fetch file from Drive: ${driveResponse.status}`);
        }

        const blob = await driveResponse.blob();
        const arrayBuffer = await blob.arrayBuffer();
        base64Data = encode(new Uint8Array(arrayBuffer));
        
        if (!finalMimeType) {
            const metaResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=mimeType`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const meta = await metaResponse.json();
            finalMimeType = meta.mimeType;
        }
    } else if (fileContent) {
        base64Data = fileContent.includes(',') ? fileContent.split(',')[1] : fileContent;
    }

    if (!base64Data || !finalMimeType) {
      return new Response(JSON.stringify({ error: 'File content/ID and mimeType are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const systemPrompt = `You are a clinical assistant. 
Analyze the provided medical report (X-ray, blood test, MRI, etc.) and provide a very concise gist (2-3 sentences).
Focus on findings and abnormalities. Be strictly factual and concise.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemPrompt },
              {
                inline_data: {
                  mime_type: finalMimeType,
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
          maxOutputTokens: 200,
          temperature: 0.1
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      return new Response(JSON.stringify({ error: 'AI summarization failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    const summary = data.candidates[0].content.parts[0].text.trim();

    return new Response(JSON.stringify({ summary }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error in summarize-report function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
