import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
import { getGoogleAccessToken } from "../_shared/google-auth.ts";
import { corsHeaders } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber, patientId, folderId } = await req.json();

    if (patientId) {
      const prescription = await getLatestConsultationByPatientId(patientId);
      return new Response(JSON.stringify(prescription), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else if (folderId) {
      const prescription = await getPrescriptionFromGoogleDrive({ folderId });
      return new Response(JSON.stringify(prescription), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else if (phoneNumber) {
      const last10Digits = phoneNumber.slice(-10);
      const { data: patients, error } = await supabase
        .from('patients')
        .select('id, name')
        .like('phone', `%${last10Digits}`);

      if (error || !patients || patients.length === 0) {
        console.warn('Database search failed or returned no results. Falling back to Google Drive.', error);
        const prescription = await getPrescriptionFromGoogleDrive({ phoneNumber });
        return new Response(JSON.stringify(prescription), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (patients.length === 1) {
        const prescription = await getLatestConsultationByPatientId(patients[0].id);
        return new Response(JSON.stringify(prescription), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        return new Response(JSON.stringify({ patients, source: 'database' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
        return new Response(JSON.stringify({ error: 'Phone number, patient ID, or folder ID is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Error in get-latest-prescription:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getLatestConsultationByPatientId(patientId: string) {
  const { data: consultation, error } = await supabase
    .from('consultations')
    .select('consultation_data, patients (name)')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !consultation) {
    console.warn(`No consultation found for patientId ${patientId}.`, error);
    return { medications: [] };
  }

  const { consultation_data, patients: patient } = consultation;

  return {
    medications: consultation_data.medications || [],
    investigations: consultation_data.investigations,
    patientName: patient.name,
    advice: consultation_data.advice,
  };
}

async function getPrescriptionFromGoogleDrive({ phoneNumber, folderId }: { phoneNumber?: string, folderId?: string }) {
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) {
    throw new Error("Missing Google access token");
  }

  if (folderId) {
    // If a folderId is provided, we can directly fetch the latest prescription from it.
    return await extractPrescriptionFromFolder(folderId, accessToken);
  }

  if (phoneNumber) {
    const searchQuery = encodeURIComponent(`fullText contains '${phoneNumber}' and mimeType='application/vnd.google-apps.document'`);
    const searchResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=${searchQuery}&fields=files(id,name,parents)`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const searchData = await searchResponse.json();
    const matchingDocs = searchData.files || [];

    if (matchingDocs.length === 0) {
      return { medications: [] };
    }

    const parentFolderIds = new Set(matchingDocs.flatMap(doc => doc.parents || []));

    if (parentFolderIds.size === 1) {
      return await extractPrescriptionFromFolder(Array.from(parentFolderIds)[0], accessToken);
    } else {
      const folderPromises = Array.from(parentFolderIds).map(async (id) => {
        const folderResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?fields=name`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const folderData = await folderResponse.json();
        return { id, name: folderData.name };
      });
      const folders = await Promise.all(folderPromises);
      return { patients: folders.filter(f => f.name), source: 'gdrive' };
    }
  }

  return { medications: [] };
}

async function extractPrescriptionFromFolder(folderId: string, accessToken: string) {
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

  return {
    medications: patientData.medications || [],
    investigations: patientData.investigations,
    patientName: patientData.name,
    advice: patientData.advice,
  };
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
                    cellText = cellText.replace(/\n/g, ' ').trim();
                    cellTexts.push(cellText);
                }
            }
            tableText += cellTexts.join('\t') + '\n';
        }
    }
    return tableText;
}

function parsePatientData(documentText: string): { medications?: any[], investigations?: string, name?: string, advice?: string } {
    const data: { medications?: any[], investigations?: string, name?: string, advice?: string } = {};
    const nameMatch = documentText.match(/Name:\s*(?:{{name}}|([^\s\n\r{]+(?:\s+[^\s\n\r{]+)*?))\s*(?:D\.O\.B)/i);
    if (nameMatch && nameMatch[1] && !nameMatch[1].includes('{{')) {
        data.name = nameMatch[1].trim();
    }

    const investigationsMatch = documentText.match(/Investigations[:\s]*(?:{{investigations}}|([\s\S]*?))(?=\s*(?:→|Diagnosis:|Advice:|[A-Z][A-Za-z\s]+:|$))/i);
    if (investigationsMatch && investigationsMatch[1] && !investigationsMatch[1].includes('{{')) {
        data.investigations = investigationsMatch[1].trim();
    }

    const adviceMatch = documentText.match(/Advice[:\s]*(?:{{advice}}|([^→\n\r{}]+(?:\n[^→\n\r{}]*)*?))\s*(?:→|Medication|Get free|Followup|$)/i);
    if (adviceMatch && adviceMatch[1] && !adviceMatch[1].includes('{{')) {
        data.advice = adviceMatch[1].trim();
    }

    try {
        const medications = [];
        const medicationTableMatch = documentText.match(/Medication:(.*?)(?:→|Get free|Followup)/s);
        if (medicationTableMatch && medicationTableMatch[1]) {
            const tableContent = medicationTableMatch[1];
            const lines = tableContent.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
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
                if (line.includes('\t')) {
                    cols = line.split('\t').map((c) => c.trim());
                } else {
                    cols = line.split(/\s{2,}/).map((c) => c.trim()).filter((c) => c.length > 0);
                }
                if (cols.length < 3) continue;
                const indexCol = cols[0];
                if (!/^\d+\.?$/.test(indexCol)) continue;
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
