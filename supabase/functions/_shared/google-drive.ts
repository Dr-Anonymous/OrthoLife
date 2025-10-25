// supabase/functions/_shared/google-drive.ts

export async function createOrGetPatientFolder({
  patientName,
  accessToken,
  templateId,
  folderId,
}: {
  patientName: string;
  accessToken: string;
  templateId: string;
  folderId?: string | null;
}): Promise<string | null> {
  if (folderId) {
    return folderId;
  }

  try {
    // 1. Find the parent of the template document
    const tplResp = await fetch(
      `https://www.googleapis.com/drive/v3/files/${templateId}?fields=parents`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!tplResp.ok) {
      console.warn("Could not fetch template details:", await tplResp.text());
      return null;
    }

    const tpl = await tplResp.json();
    const templateParent = tpl.parents?.[0] || null;

    if (!templateParent) {
      console.warn("Template parent not found.");
      return null;
    }

    // 2. Create the new patient folder inside the template's parent folder
    const createFolderResp = await fetch(
      `https://www.googleapis.com/drive/v3/files`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: patientName,
          mimeType: "application/vnd.google-apps.folder",
          parents: [templateParent],
        }),
      }
    );

    if (createFolderResp.ok) {
      const folderData = await createFolderResp.json();
      return folderData.id;
    } else {
      console.error(
        "Could not create Google Drive folder:",
        await createFolderResp.text()
      );
      return null;
    }
  } catch (error) {
    console.error("Error creating Google Drive folder:", error);
    return null;
  }
}
