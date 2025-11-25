// scripts/handle_google_drive_backup.js

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// Configuration from environment variables
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const BACKUP_FILE_PATH = process.env.BACKUP_FILE_PATH;
const BACKUP_FOLDER_ID = '1K_5A3XPE6TOopH4uRM2vgOmb3iRwRhEI';
const DAILY_RETENTION_DAYS = 30;
const WEEKLY_RETENTION_WEEKS = 4;

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !BACKUP_FILE_PATH) {
    console.error('Missing required environment variables.');
    process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    'urn:ietf:wg:oauth:2.0:oob' // Redirect URI for server-side apps
);
oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const drive = google.drive({ version: 'v3', auth: oauth2Client });

async function uploadBackup(folderId) {
    if (!fs.existsSync(BACKUP_FILE_PATH)) {
        throw new Error(`Backup file not found at path: ${BACKUP_FILE_PATH}`);
    }

    const fileName = path.basename(BACKUP_FILE_PATH);
    const fileSize = fs.statSync(BACKUP_FILE_PATH).size;
    const fileMetadata = {
        name: fileName,
        parents: [folderId],
    };
    const media = {
        mimeType: 'application/sql',
        body: fs.createReadStream(BACKUP_FILE_PATH),
    };

    console.log(`Uploading backup file: ${fileName}`);
    const res = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id',
    }, {
        onUploadProgress: evt => {
            const progress = (evt.bytesRead / fileSize) * 100;
            process.stdout.write(`Upload progress: ${Math.round(progress)}%\r`);
        },
    });
    console.log(`\nFile uploaded successfully with ID: ${res.data.id}`);
}

async function cleanupOldBackups(folderId) {
    console.log('Starting cleanup of old backups...');
    const res = await drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id, name, createdTime)',
        pageSize: 1000,
    });

    const files = res.data.files;
    if (files.length === 0) {
        console.log('No backups found to clean up.');
        return;
    }

    const now = new Date();
    for (const file of files) {
        const parts = file.name.split('-');
        if (parts.length < 3 || parts[0] !== 'backup') continue;

        const type = parts[1]; // 'daily' or 'weekly'
        const createdDate = new Date(file.createdTime);
        const ageInDays = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);

        let shouldDelete = false;
        if (type === 'daily' && ageInDays > DAILY_RETENTION_DAYS) {
            shouldDelete = true;
        } else if (type === 'weekly' && ageInDays > WEEKLY_RETENTION_WEEKS * 7) {
            shouldDelete = true;
        }

        if (shouldDelete) {
            try {
                await drive.files.delete({ fileId: file.id });
                console.log(`Deleted old backup: ${file.name}`);
            } catch (err) {
                console.error(`Failed to delete file ${file.name}:`, err.message);
            }
        }
    }
    console.log('Cleanup complete.');
}

async function main() {
    try {
        await uploadBackup(BACKUP_FOLDER_ID);
        await cleanupOldBackups(BACKUP_FOLDER_ID);
    } catch (error) {
        console.error('An error occurred during the backup process:', error.message);
        process.exit(1);
    }
}

main();
