import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
import { corsHeaders } from '../_shared/cors.ts';
import { verify, decode } from "https://deno.land/x/djwt@v2.2/mod.ts";

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const GOOGLE_KEYS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

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
        getSpkiFromX509(keys[keyId]),
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

function getSpkiFromX509(pem: string): ArrayBuffer {
  const pemHeader = "-----BEGIN CERTIFICATE-----";
  const pemFooter = "-----END CERTIFICATE-----";
  const pemContents = pem.substring(pemHeader.length, pem.length - pemFooter.length).replace(/\s/g, '');
  const binaryDer = new Uint8Array(atob(pemContents).split('').map(c => c.charCodeAt(0)));

  // A robust ASN.1 parser to find the SubjectPublicKeyInfo block
  let offset = 0;

  const readLength = () => {
    offset++; // Move past the tag
    let length = binaryDer[offset++];
    if (length > 127) {
      const size = length & 0x7F;
      length = 0;
      for (let i = 0; i < size; i++) {
        length = (length << 8) | binaryDer[offset++];
      }
    }
    return length;
  };

  const skip = (tag: number) => {
      if(binaryDer[offset] !== tag) throw new Error(`Expected tag ${tag} but got ${binaryDer[offset]}`);
      const len = readLength();
      offset += len;
  }

  skip(0x30); // Skip main sequence
  skip(0x30); // Skip TBS certificate sequence

  if (binaryDer[offset] === 0xA0) { // Optional version
      skip(0xA0);
  }

  skip(0x02); // Serial number
  skip(0x30); // Signature algorithm
  skip(0x30); // Issuer
  skip(0x30); // Validity
  skip(0x30); // Subject

  // Now at the start of SubjectPublicKeyInfo
  const spkiStart = offset;
  skip(0x30);
  const spkiEnd = offset;

  return binaryDer.slice(spkiStart, spkiEnd);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { page_visited } = await req.json();
    const userToken = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!userToken) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const [header] = decode(userToken);
    const kid = header.kid;
    if (!kid) throw new Error("Invalid token: 'kid' not found in header.");

    const publicKey = await getGooglePublicKey(kid);
    const projectId = Deno.env.get("FIREBASE_PROJECT_ID");
    if (!projectId) throw new Error("FIREBASE_PROJECT_ID environment variable is not set.");

    const verifiedPayload = await verify(userToken, publicKey, {
        issuer: `https://securetoken.google.com/${projectId}`,
        audience: projectId,
    });

    const user_phone = verifiedPayload.phone_number as string;
    if (!user_phone) throw new Error('Phone number not found in token');

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
      status: 401,
    });
  }
});
