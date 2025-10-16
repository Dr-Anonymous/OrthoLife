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

    const searchQuery = encodeURIComponent(`fullText contains '${phoneNumber}' and mimeType='application/vnd.google-apps.document'`);
    const docsResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=${searchQuery}&orderBy=modifiedTime+desc&pageSize=1&fields=files(id,name)`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    const docsData = await docsResponse.json();
    const latestDoc = docsData.files?.[0];

    if (!latestDoc) {
        return new Response(JSON.stringify({ medications: [] }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const contentResponse = await fetch(`https://docs.googleapis.com/v1/documents/${latestDoc.id}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    const contentData = await contentResponse.json();
    const documentText = extractTextFromDocument(contentData);
    const patientData = parsePatientData(documentText);

    return new Response(JSON.stringify({ medications: patientData.medications || [] }), {
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

function extractTextFromDocument(document: any): string {
    if (document.body && document.body.content) {
        const firstTable = document.body.content.find((element: any) => element.table);
        if (firstTable) {
            return extractTextFromTable(firstTable.table);
        }
    }
    return '';
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

function parsePatientData(tableText: string): { medications?: any[] } {
    const data: { medications?: any[] } = {};
    try {
        const medications = [];
        const lines = tableText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

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
                cols = line.split('\t').map(c => c.trim());
            } else {
                cols = line.split(/\s{2,}/).map(c => c.trim()).filter(c => c.length > 0);
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
        if (medications.length > 0) {
            data.medications = medications;
        }
    } catch (error) {
        console.error('Error parsing medications:', error);
    }
    return data;
}