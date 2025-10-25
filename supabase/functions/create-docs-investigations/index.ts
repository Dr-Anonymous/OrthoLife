import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getGoogleAccessToken } from "../_shared/google-auth.ts";

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

    let parents;
    let newFolderId = folderId;

    if (folderId) {
      parents = [folderId];
    } else {
      const templateParent = "1-q41-i2W-_1_e-nQ2-Z-B-1_Z-I-e-R-c-x-p-H-l-k-Q";
      if (templateParent) {
        const createFolderResp = await fetch(`https://www.googleapis.com/drive/v3/files`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [templateParent]
          })
        });

        if (createFolderResp.ok) {
          const folderData = await createFolderResp.json();
          parents = [folderData.id];
          newFolderId = folderData.id;
        } else {
          console.warn('Could not create folder; file will be created in default location.');
        }
      } else {
        console.warn('Template parent not found; file will be created in default location.');
      }
    }

    const copyResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${templateId}/copy`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, parents })
    });

    if (!copyResponse.ok) throw new Error(`Failed to copy template: ${copyResponse.statusText}`);
    const copyData = await copyResponse.json();
    const docId = copyData.id;

    let age = '';
    if (dob) {
      const birthDate = new Date(dob);
      age = (today.getFullYear() - birthDate.getFullYear() - (today < new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate()) ? 1 : 0)).toString();
    }

    const replacements = [
      { replaceAllText: { containsText: { text: '{{name}}' }, replaceText: name || '' } },
      { replaceAllText: { containsText: { text: '{{dob}}' }, replaceText: dob || '' } },
      { replaceAllText: { containsText: { text: '{{sex}}' }, replaceText: sex || '' } },
      { replaceAllText: { containsText: { text: '{{phone}}' }, replaceText: phone || '' } },
      { replaceAllText: { containsText: { text: '{{age}}' }, replaceText: age } },
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

    if (newFolderId && !folderId && templateId === "1WqiyTfWBG4j7I4iry0weMmMLEPGJZDnTNkiZHCdd9Ao") {
        const { error: updateError } = await supabaseClient
          .from('patients')
          .update({ drive_id: newFolderId })
          .eq('id', myId);
        if (updateError) console.error('Error updating patient with new drive_id:', updateError);
    }

    return new Response(JSON.stringify({ url: finalDocData.webViewLink, patientId: myId, driveId: newFolderId }), {
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