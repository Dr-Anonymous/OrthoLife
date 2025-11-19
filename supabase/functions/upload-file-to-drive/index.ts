import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getGoogleAccessToken } from "../_shared/google-auth.ts";
import { decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { patientId, fileName, fileContent, mimeType } = await req.json();
    if (!patientId || !fileName || !fileContent || !mimeType) {
      return new Response(JSON.stringify({ error: 'Patient ID, file name, file content and mimeType are required' }), {
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
    const patientUploadFolderId = await findOrCreatePatientUploadFolder(accessToken, patientId, parentFolderId);

    const parts = fileContent.split(',');
    const base64Data = parts[1];
    const decodedFileContent = decode(base64Data);

    const fileMetadata = {
        name: fileName,
        parents: [patientUploadFolderId]
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const close_delim = `\r\n--${boundary}--`;

    const metadataPart = `Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(fileMetadata)}`;
    const mediaPart = `Content-Type: ${mimeType}\r\n\r\n`;

    const body = new Blob([
      delimiter,
      metadataPart,
      delimiter,
      mediaPart,
      decodedFileContent,
      close_delim
    ]);

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body
    });

    if (!res.ok) {
        const errorData = await res.json();
        console.error('Google Drive API error:', errorData);
        throw new Error('Failed to upload file');
    }

    const uploadedFile = await res.json();

    return new Response(JSON.stringify({ success: true, file: uploadedFile }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in upload-file-to-drive:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function findOrCreatePatientUploadFolder(accessToken: string, patientId: string, parentFolderId: string): Promise<string> {
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

    const folderMetadata = {
        name: patientId,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId]
    };
    const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(folderMetadata)
    });

    if (!createResponse.ok) {
        throw new Error('Failed to create patient upload folder.');
    }

    const newFolder = await createResponse.json();
    return newFolder.id;
}
