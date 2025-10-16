import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getGoogleAccessToken } from "../_shared/google-auth.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    // Find patient folders by phone number
    const patientFolders = await searchPhoneNumber(accessToken, phoneNumber);
    if (!patientFolders || patientFolders.length === 0) {
      return new Response(JSON.stringify({ medications: [] }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the latest prescription from the first found folder
    const latestPrescription = await getLatestPrescriptionData(accessToken, patientFolders[0].id);

    return new Response(JSON.stringify({ medications: latestPrescription.medications || [] }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-latest-prescription:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function searchPhoneNumber(accessToken: string, phoneNumber: string) {
  try {
    const searchQuery = encodeURIComponent(`fullText contains '${phoneNumber}' and mimeType='application/vnd.google-apps.document'`);
    const searchResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=${searchQuery}&fields=files(id,name,parents)`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    const searchData = await searchResponse.json();
    const matchingDocs = searchData.files || [];

    if (matchingDocs.length === 0) return [];

    const parentFolderIds = new Set<string>();
    matchingDocs.forEach((doc: any) => {
      if (doc.parents && doc.parents.length > 0) {
        parentFolderIds.add(doc.parents[0]);
      }
    });

    const folderPromises = Array.from(parentFolderIds).map(async (folderId) => {
      try {
        const folderResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}?fields=name`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        const folderData = await folderResponse.json();
        return { id: folderId, name: folderData.name };
      } catch (error) {
        console.error(`Error fetching folder name for ID ${folderId}:`, error);
        return null;
      }
    });

    const folderObjects = await Promise.all(folderPromises);
    return folderObjects.filter((folder): folder is { id: string; name: string } => folder !== null && !!folder.name);
  } catch (error) {
    console.error('Error in phone number search:', error);
    return [];
  }
}

async function getLatestPrescriptionData(accessToken: string, folderId: string) {
  const docsResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType='application/vnd.google-apps.document'&orderBy=modifiedTime+desc&pageSize=1&fields=files(id,name)`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  const docsData = await docsResponse.json();
  const latestDoc = docsData.files?.[0];

  if (!latestDoc) {
    return { medications: [] };
  }

  const contentResponse = await fetch(`https://docs.googleapis.com/v1/documents/${latestDoc.id}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  const contentData = await contentResponse.json();
  const documentText = extractTextFromDocument(contentData);
  const patientData = parsePatientData(documentText);

  return { medications: patientData.medications || [] };
}

function extractTextFromDocument(document: any): string {
    let text = '';
    if (document.body && document.body.content) {
        for (const element of document.body.content) {
            if (element.paragraph) {
                for (const textElement of element.paragraph.elements || []) {
                    if (textElement.textRun) {
                        text += textElement.textRun.content;
                    }
                }
            } else if (element.table) {
                text += extractTextFromTable(element.table);
            }
        }
    }
    return text;
}

function extractTextFromTable(table: any): string {
    let tableText = '';
    if (table.tableRows) {
        for (const row of table.tableRows) {
            const cellTexts: string[] = [];
            if (row.tableCells) {
                for (let cellIndex = 0; cellIndex < row.tableCells.length; cellIndex++) {
                    const cell = row.tableCells[cellIndex];
                    let cellText = '';
                    if (cell && cell.content) {
                        for (const cellElement of cell.content) {
                            if (cellElement.paragraph) {
                                for (const textElement of cellElement.paragraph.elements || []) {
                                    if (textElement.textRun) {
                                        cellText += textElement.textRun.content;
                                    }
                                }
                            }
                        }
                    }
                    cellText = cellText.replace(/\\n/g, ' ').trim();
                    cellTexts.push(cellText);
                }
            }
            tableText += cellTexts.join('\\t') + '\\n';
        }
    }
    return tableText;
}

function parsePatientData(documentText: string): { medications?: any[] } {
    const data: { medications?: any[] } = {};
    try {
        const medications = [];
        const medicationTableMatch = documentText.match(/Medication:(.*?)(?:→|Get free|Followup)/s);
        if (medicationTableMatch && medicationTableMatch[1]) {
            const tableContent = medicationTableMatch[1];
            const lines = tableContent.split('\\n').map(line => line.trim()).filter(line => line.length > 0);

            const isTruthyMarker = (val?: string) => {
                if (!val) return false;
                const v = val.trim().toLowerCase();
                return v === '✔' || v === '✓' || v === 'true' || v === '1' || v === 'yes' || v === 'y' || v.includes('✔');
            };

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.includes('Name') && line.includes('Dose') || line.includes('Morning') || line.includes('ఉదయం') || line.includes('Frequency')) {
                    continue;
                }

                let cols: string[];
                if (line.includes('\\t')) {
                    cols = line.split('\\t').map(c => c.trim());
                } else {
                    cols = line.split(/\\s{2,}/).map(c => c.trim()).filter(c => c.length > 0);
                }

                if (cols.length < 3) continue;
                const indexCol = cols[0];
                if (!/^\\d+\\.?$/.test(indexCol)) continue;

                const name = cols[1] || '';
                const dose = cols[2] || '';
                if (!name || name.length < 2 || name.toLowerCase().includes('name')) continue;

                const morningMark = cols[3] || '';
                const noonMark = cols[4] || '';
                const nightMark = cols[5] || '';
                const duration = cols[6] || '';
                const instructions = cols[7] || '';

                medications.push({
                    name: name,
                    dose: dose,
                    freqMorning: isTruthyMarker(morningMark),
                    freqNoon: isTruthyMarker(noonMark),
                    freqNight: isTruthyMarker(nightMark),
                    duration: duration,
                    instructions: instructions,
                });
            }
        }
        if (medications.length > 0) {
            data.medications = medications;
        }
    } catch (error) {
        console.error('Error parsing medications:', error);
    }
    return data;
}