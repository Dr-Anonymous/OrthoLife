import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getGoogleAccessToken } from "../_shared/google-auth.ts";
import { createOrGetPatientFolder } from "../_shared/google-drive.ts";

const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const today = new Date();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Only POST allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  try {
    const data = await req.json();
    const accessToken = await getGoogleAccessToken();

    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Missing Google access token' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { templateId, patientId, name, dob, sex, phone, complaints, investigations, diagnosis, folderId } = data;
    const myId = patientId || await generateIncrementalId(supabaseClient);

    const finalFolderId = await createOrGetPatientFolder({
      patientName: name,
      accessToken,
      templateId,
      folderId,
    });

    if (!finalFolderId) {
      throw new Error("Could not create or find Google Drive folder.");
    }

    const copyResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${templateId}/copy`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, parents: [finalFolderId] })
    });

    if (!copyResponse.ok) throw new Error(`Failed to copy template: ${copyResponse.statusText}`);
    const copyData = await copyResponse.json();
    const docId = copyData.id;

    const replacements = [
      { replaceAllText: { containsText: { text: '{{name}}' }, replaceText: name || '' } },
      { replaceAllText: { containsText: { text: '{{dob}}' }, replaceText: dob || '' } },
      { replaceAllText: { containsText: { text: '{{sex}}' }, replaceText: sex || '' } },
      { replaceAllText: { containsText: { text: '{{phone}}' }, replaceText: phone || '' } },
      { replaceAllText: { containsText: { text: '{{age}}' }, replaceText: data.age || '' } },
      { replaceAllText: { containsText: { text: '{{id}}' }, replaceText: myId } },
      { replaceAllText: { containsText: { text: '{{date}}' }, replaceText: today.toLocaleDateString('en-GB') } },
      { replaceAllText: { containsText: { text: '{{complaints}}' }, replaceText: complaints || '' } },
      { replaceAllText: { containsText: { text: '{{investigations}}' }, replaceText: investigations || '' } },
      { replaceAllText: { containsText: { text: '{{diagnosis}}' }, replaceText: diagnosis || '' } }
    ];

    if (replacements.length > 0) {
      await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: replacements })
      });
    }

    const finalDocResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${docId}?fields=webViewLink`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!finalDocResponse.ok) throw new Error(`Failed to get document URL: ${finalDocResponse.statusText}`);
    const finalDocData = await finalDocResponse.json();

    if (finalFolderId && !folderId && templateId === "1lcWQlx9YdMPBed6HbZKm8cPrFGghS43AmPXGhf9lBG0") {
        const { error: updateError } = await supabaseClient
          .from('patients')
          .update({ drive_id: finalFolderId })
          .eq('id', myId);
        if (updateError) console.error('Error updating patient with new drive_id:', updateError);
    }

    return new Response(JSON.stringify({ url: finalDocData.webViewLink, patientId: myId, driveId: finalFolderId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function generateIncrementalId(supabaseClient) {
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const dateKey = `${yyyy}${mm}${dd}`;
  try {
    const { data, error } = await supabaseClient.rpc('increment_patient_counter', { input_date_key: dateKey });
    if (error) throw error;
    return `${dateKey}${data || 1}`;
  } catch (error) {
    console.error('Error generating incremental ID:', error);
    return `${dateKey}${Date.now().toString().slice(-3)}`;
  }
}