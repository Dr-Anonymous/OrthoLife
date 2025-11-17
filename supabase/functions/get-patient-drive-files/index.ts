
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getGoogleAccessToken } from "../_shared/google-auth.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { searchFoldersByPhoneNumber } from "../_shared/google-drive.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { phoneNumber } = await req.json();
    if (!phoneNumber) {
      return new Response(JSON.stringify({ error: 'Phone number is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessToken = await getGoogleAccessToken();
    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Missing Google access token' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const patientFolders = await getPatientFiles(accessToken, phoneNumber);

    return new Response(JSON.stringify({ patientFolders }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-patient-drive-files:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getPatientFiles(accessToken: string, phoneNumber: string) {
    const parentFolderIds = await searchFoldersByPhoneNumber(accessToken, phoneNumber);

    const folderPromises = Array.from(parentFolderIds).map(async (folderId) => {
        const folderResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}?fields=name`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const folderData = await folderResponse.json();
        const filesQuery = encodeURIComponent(`'${folderId}' in parents`);
        const filesResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=${filesQuery}&fields=files(id,name,createdTime,mimeType)`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const filesData = await filesResponse.json();
        const files = await Promise.all((filesData.files || []).map(async (file: any) => {
          if (file.name === 'uploads' && file.mimeType === 'application/vnd.google-apps.folder') {
            const subFilesQuery = encodeURIComponent(`'${file.id}' in parents`);
            const subFilesResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=${subFilesQuery}&fields=files(id,name,createdTime,mimeType)`, {
              headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const subFilesData = await subFilesResponse.json();
            return { ...file, files: subFilesData.files || [] };
          }
          return file;
        }));
        return { id: folderId, name: folderData.name, files };
      });

      const folderObjects = await Promise.all(folderPromises);
      return folderObjects.filter(folder => folder !== null && folder.name);
}
