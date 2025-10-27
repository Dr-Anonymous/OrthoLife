import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
import { corsHeaders } from '../_shared/cors.ts';
import { verify, decode } from "https://deno.land/x/djwt@v2.2/mod.ts";

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const GOOGLE_KEYS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

// Cache for Google's public keys
let googlePublicKeys: Map<string, CryptoKey> | null = null;
let lastKeyFetchTime = 0;
const KEY_CACHE_DURATION = 60 * 60 * 1000; // 1 hour

async function getGooglePublicKey(kid: string): Promise<CryptoKey> {
  const now = Date.now();
  if (!googlePublicKeys || (now - lastKeyFetchTime > KEY_CACHE_DURATION)) {
    const response = await fetch(GOOGLE_KEYS_URL);
    if (!response.ok) {
      throw new Error("Failed to fetch Google's public keys.");
    }
    const keys = await response.json();
    googlePublicKeys = new Map();
    for (const keyId in keys) {
      const publicKey = await crypto.subtle.importKey(
        "spki",
        pemToBuffer(keys[keyId]),
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        true,
        ["verify"]
      );
      googlePublicKeys.set(keyId, publicKey);
    }
    lastKeyFetchTime = now;
  }

  const key = googlePublicKeys?.get(kid);
  if (!key) {
    throw new Error(`Public key with kid '${kid}' not found.`);
  }
  return key;
}

function pemToBuffer(pem: string): ArrayBuffer {
  const base64 = pem.replace(/-{5}(BEGIN|END) PUBLIC KEY-{5}/g, "").replace(/\s/g, "");
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0)).buffer;
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { page_visited } = await req.json();
    const userToken = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!userToken) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const [header, payload] = decode(userToken);
    const kid = header.kid;
    if (!kid) {
        throw new Error("Invalid token: 'kid' not found in header.");
    }

    const publicKey = await getGooglePublicKey(kid);
    const projectId = "ortholife-otp-auth";
    const verifiedPayload = await verify(userToken, publicKey, {
        issuer: `https://securetoken.google.com/${projectId}`,
        audience: projectId,
    });

    const user_phone = verifiedPayload.phone_number as string;

    if (!user_phone) {
        throw new Error('Phone number not found in token');
    }

    const { error: insertError } = await supabaseAdmin
      .from('user_activity')
      .insert({ user_phone, page_visited });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401, // Use 401 for auth-related errors
    });
  }
});
