import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
import { corsHeaders } from '../_shared/cors.ts';
import { verify, decode } from "https://deno.land/x/djwt@v2.2/mod.ts";
import { encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const GOOGLE_KEYS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

let googlePublicKeys: Map<string, CryptoKey> | null = null;
let lastKeyFetchTime = 0;
const KEY_CACHE_DURATION = 60 * 60 * 1000;

async function getGooglePublicKey(kid: string): Promise<CryptoKey> {
  const now = Date.now();
  if (!googlePublicKeys || (now - lastKeyFetchTime > KEY_CACHE_DURATION)) {
    const response = await fetch(GOOGLE_KEYS_URL);
    if (!response.ok) throw new Error("Failed to fetch Google's public keys.");
    const keys = await response.json();
    googlePublicKeys = new Map();
    for (const keyId in keys) {
      const spki = parseCertificate(keys[keyId]);
      const publicKey = await crypto.subtle.importKey(
        "spki",
        spki,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        true,
        ["verify"]
      );
      googlePublicKeys.set(keyId, publicKey);
    }
    lastKeyFetchTime = now;
  }
  const key = googlePublicKeys?.get(kid);
  if (!key) throw new Error(`Public key with kid '${kid}' not found.`);
  return key;
}

function parseCertificate(cert: string): ArrayBuffer {
  const pem = cert.replace(/-{5}(BEGIN|END) CERTIFICATE-{5}/g, "").replace(/\s/g, "");
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));

  let offset = 0;

  const readLength = () => {
    offset++;
    let length = der[offset++];
    if (length > 127) {
      const size = length & 0x7F;
      length = 0;
      for (let i = 0; i < size; i++) {
        length = (length << 8) | der[offset++];
      }
    }
    return length;
  };

  const expectTag = (tag: number) => {
    if (der[offset++] !== tag) throw new Error("Invalid certificate structure");
  };

  expectTag(0x30);
  readLength();

  expectTag(0x30);
  const tbsEnd = offset + readLength();

  while (offset < tbsEnd) {
      const tag = der[offset];
      if (tag === 0x30 && der[offset+2] === 0x0D && der[offset+3] === 0x06) {
          break;
      }
      offset++;
      const len = readLength();
      offset += len;
  }

  while(der[offset] !== 0x30) {
      offset--;
  }

  const spkiLength = readLength();
  const spkiEnd = offset + spkiLength;

  return der.slice(offset-2, spkiEnd);
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
