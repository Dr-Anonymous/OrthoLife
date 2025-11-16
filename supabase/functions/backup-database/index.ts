import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { getGoogleAccessToken } from "../_shared/google-auth.ts";

const DATABASE_URL = Deno.env.get("SUPABASE_DB_URL");
const DAILY_RETENTION_DAYS = 30;
const WEEKLY_RETENTION_WEEKS = 4;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type } = await req.json(); // 'daily' or 'weekly'
    if (!type || (type !== 'daily' && type !== 'weekly')) {
      return new Response(JSON.stringify({ error: 'Backup type "daily" or "weekly" is required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const accessToken = await getGoogleAccessToken();
    const backupFolderId = await findOrCreateFolder(accessToken, "Database Backups");

    // 1. Dump the database
    const timestamp = new Date().toISOString();
    const fileName = `backup-${type}-${timestamp}.sql`;
    const filePath = `/tmp/${fileName}`;

    const command = new Deno.Command("pg_dump", {
      args: [
        "-d",
        DATABASE_URL,
        "-f",
        filePath,
      ],
    });
    const { code, stderr } = await command.output();

    if (code !== 0) {
      throw new Error(`pg_dump failed: ${new TextDecoder().decode(stderr)}`);
    }

    // 2. Upload to Google Drive
    const fileContent = await Deno.readFile(filePath);

    const fileMetadata = {
        name: fileName,
        parents: [backupFolderId]
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const close_delim = `\r\n--${boundary}--`;

    const metadataPart = `Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(fileMetadata)}`;
    const mediaPart = `Content-Type: application/sql\r\n\r\n`;

    const body = new Blob([
      delimiter,
      metadataPart,
      delimiter,
      mediaPart,
      fileContent,
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
        throw new Error('Failed to upload backup file');
    }

    await Deno.remove(filePath);

    // 3. Cleanup old backups
    await cleanupOldBackups(accessToken, backupFolderId);


    return new Response(JSON.stringify({ success: true, message: `Backup ${fileName} uploaded and old backups cleaned.` }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in backup-database:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function findOrCreateFolder(accessToken: string, folderName: string): Promise<string> {
  const searchQuery = encodeURIComponent(`name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const searchResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=${searchQuery}&fields=files(id)`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!searchResponse.ok) {
      throw new Error('Failed to search for folder.');
  }

  const searchData = await searchResponse.json();
  if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
  }

  const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
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
      throw new Error('Failed to create folder.');
  }

  const newFolder = await createResponse.json();
  return newFolder.id;
}

async function cleanupOldBackups(accessToken: string, folderId: string) {
  const listQuery = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const listResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=${listQuery}&fields=files(id,name,createdTime)`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!listResponse.ok) {
    console.error("Failed to list backups for cleanup.");
    return;
  }

  const listData = await listResponse.json();
  const files = listData.files || [];
  const now = new Date();

  for (const file of files) {
    const parts = file.name.split('-');
    if (parts.length < 3 || parts[0] !== 'backup') continue;

    const type = parts[1];
    const createdDate = new Date(file.createdTime);
    const ageInDays = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);

    let shouldDelete = false;
    if (type === 'daily' && ageInDays > DAILY_RETENTION_DAYS) {
      shouldDelete = true;
    } else if (type === 'weekly' && ageInDays > WEEKLY_RETENTION_WEEKS * 7) {
      shouldDelete = true;
    }

    if (shouldDelete) {
      console.log(`Deleting old backup: ${file.name}`);
      await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
    }
  }
}
