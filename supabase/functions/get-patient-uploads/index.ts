
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getGoogleAccessToken } from "../_shared/google-auth.ts";
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { patientId } = await req.json();
    if (!patientId) {
      return new Response(JSON.stringify({ error: 'Patient ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const accessToken = await getGoogleAccessToken();
    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Missing Google access token' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const parentFolderId = "1PwsXLaJFr6_D6WVoH2XlcCKRWnD1E1EY";
    const patientUploadFolderId = await findPatientUploadFolder(accessToken, patientId, parentFolderId);

    if (!patientUploadFolderId) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const files = await getFilesInFolder(accessToken, patientUploadFolderId);

    return new Response(JSON.stringify(files), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in get-patient-uploads:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function findPatientUploadFolder(accessToken: string, patientId: string, parentFolderId: string): Promise<string | null> {
    const searchQuery = encodeURIComponent(`'${parentFolderId}' in parents and name='${patientId}' and mimeType='application/vnd.google-apps.folder'`);
    const searchResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=${searchQuery}&fields=files(id)`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!searchResponse.ok) {
        throw new Error('Failed to search for patient upload folder.');
    }

    const searchData = await searchResponse.json();
    if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id;
    }

    return null;
}

async function getFilesInFolder(accessToken: string, folderId: string): Promise<any[]> {
    const searchQuery = encodeURIComponent(`'${folderId}' in parents`);
    const searchResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=${searchQuery}&fields=files(id, name, createdTime)`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!searchResponse.ok) {
        throw new Error('Failed to fetch files in folder.');
    }

    const searchData = await searchResponse.json();
    return searchData.files || [];
}
