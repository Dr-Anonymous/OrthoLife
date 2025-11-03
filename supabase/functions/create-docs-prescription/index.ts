import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getGoogleAccessToken } from "../_shared/google-auth.ts";
import { createOrGetPatientFolder } from "../_shared/google-drive.ts";

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

    const { templateId, patientId, folderId } = data;
    const myId = patientId || await generateIncrementalId(supabaseClient);

    const finalFolderId = await createOrGetPatientFolder({
      patientName: data.name,
      accessToken,
      templateId,
      folderId,
    });

    if (!finalFolderId) {
      throw new Error("Could not create or find Google Drive folder.");
    }

    const copyResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${templateId}/copy`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: data.name, parents: [finalFolderId] })
    });

    if (!copyResponse.ok) throw new Error(`Failed to copy template: ${copyResponse.statusText}`);
    const copyData = await copyResponse.json();
    const docId = copyData.id;

    const replacements = [
        {replaceAllText: { containsText: { text: '{{name}}'}, replaceText: data.name || ''}},
        {replaceAllText: { containsText: { text: '{{dob}}'}, replaceText: data.dob || ''}},
        {replaceAllText: { containsText: { text: '{{sex}}'}, replaceText: data.sex || ''}},
        {replaceAllText: { containsText: { text: '{{phone}}'}, replaceText: data.phone || ''}},
        {replaceAllText: { containsText: { text: '{{age}}'}, replaceText: data.age || ''}},
        {replaceAllText: { containsText: { text: '{{id}}'}, replaceText: myId}},
        {replaceAllText: { containsText: { text: '{{date}}'}, replaceText: today.toLocaleDateString('en-GB')}},
        {replaceAllText: { containsText: { text: '{{complaints}}'}, replaceText: data.complaints || ''}},
        {replaceAllText: { containsText: { text: '{{findings}}'}, replaceText: data.findings || ''}},
        {replaceAllText: { containsText: { text: '{{investigations}}'}, replaceText: data.investigations || ''}},
        {replaceAllText: { containsText: { text: '{{diagnosis}}'}, replaceText: data.diagnosis || ''}},
        {replaceAllText: { containsText: { text: '{{advice}}'}, replaceText: data.advice || ''}},
        {replaceAllText: { containsText: { text: '{{followup}}'}, replaceText: data.followup || ''}}
    ];

    try {
        const qrDocResponse = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (!qrDocResponse.ok) throw new Error('Failed to fetch document for QR code placement');
        const qrDoc = await qrDocResponse.json();

        const findTextInContent = (content, searchText) => {
            for (const element of content) {
                if (element.paragraph?.elements) {
                    for (const textElement of element.paragraph.elements) {
                        if (textElement.textRun?.content?.includes(searchText)) {
                            const textContent = textElement.textRun.content;
                            const textStartIndex = textElement.startIndex;
                            const placeholderStart = textContent.indexOf(searchText);
                            return { index: textStartIndex + placeholderStart, length: searchText.length };
                        }
                    }
                }
            }
            return null;
        };
        const qrLoc = findTextInContent(qrDoc.body.content, '{{waqr}}');
        if(qrLoc) {
            const waData = `https://ortho.life/auth?phone=${data.phone}`;
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=76x76&data=${encodeURIComponent(waData)}`;
            const qrResponse = await fetch(qrUrl);
            if (qrResponse.ok && qrLoc) {
                const qrArrayBuffer = await qrResponse.arrayBuffer();
                const qrBase64 = btoa(String.fromCharCode(...new Uint8Array(qrArrayBuffer)));
                replacements.unshift({
                    deleteContentRange: { range: { startIndex: qrLoc.index, endIndex: qrLoc.index + qrLoc.length } }
                }, {
                    insertInlineImage: {
                        location: { index: qrLoc.index },
                        uri: `data:image/png;base64,${qrBase64}`,
                        objectSize: { height: { magnitude: 76, unit: 'PT' }, width: { magnitude: 76, unit: 'PT' } }
                    }
                });
            } else {
                replacements.push({ replaceAllText: { containsText: { text: '{{waqr}}' }, replaceText: 'QR Code' } });
            }
        }
    } catch(qrError) {
        console.error('Error handling QR code:', qrError);
        replacements.push({ replaceAllText: { containsText: { text: '{{waqr}}' }, replaceText: 'QR Code' } });
    }

    if (replacements.length > 0) {
        await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ requests: replacements })
        });
    }

    if (data.medications) {
        try {
            const meds = Array.isArray(data.medications) ? data.medications : JSON.parse(data.medications);
            if (meds.length > 0) {
                const docResponse = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
                if (!docResponse.ok) throw new Error(`Failed to fetch document: ${docResponse.statusText}`);
                const doc = await docResponse.json();

                let table, tableStartIndex = -1;
                for (const element of doc.body.content) if (element.table) {
                    table = element.table;
                    tableStartIndex = element.startIndex;
                    break;
                }

                if (table && tableStartIndex !== -1) {
                    const insertRowRequests = meds.flatMap(med => {
                        const requests = [{ insertTableRow: { tableCellLocation: { tableStartLocation: { index: tableStartIndex }, rowIndex: table.tableRows.length - 1, columnIndex: 0 }, insertBelow: true } }];
                        if (med.notes && med.notes.trim() !== "") {
                            requests.push({ insertTableRow: { tableCellLocation: { tableStartLocation: { index: tableStartIndex }, rowIndex: table.tableRows.length, columnIndex: 0 }, insertBelow: true } });
                        }
                        return requests;
                    });

                    if (insertRowRequests.length > 0) {
                        await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ requests: insertRowRequests })
                        });
                    }

                    const finalDocResponse = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
                    if (!finalDocResponse.ok) throw new Error(`Failed to fetch updated document: ${finalDocResponse.statusText}`);
                    const finalDoc = await finalDocResponse.json();

                    let updatedTable;
                    for (const element of finalDoc.body.content) if (element.table) updatedTable = element.table;

                    if (updatedTable) {
                        const cellRequests = [];
                        const mergeRequests = [];
                        let rowIndex = updatedTable.tableRows.length - meds.reduce((acc, med) => acc + (med.notes && med.notes.trim() !== "" ? 2 : 1), 0);

                        const getCellInsertionIndex = (cell) => {
                            if (!cell?.content?.[0]?.paragraph) return null;
                            const p = cell.content[0].paragraph;
                            return p.elements?.[0]?.textRun ? p.elements[0].startIndex : p.elements?.[0]?.startIndex;
                        };

                        meds.forEach((med, medIndex) => {
                            const row = updatedTable.tableRows[rowIndex];
                            if (row?.tableCells?.length >= 8) {
                                const createInsert = (cell, text) => {
                                    const index = getCellInsertionIndex(cell);
                                    return index && text ? { insertText: { location: { index }, text } } : null;
                                };
                                cellRequests.push(createInsert(row.tableCells[0], (medIndex + 1).toString()));
                                cellRequests.push(createInsert(row.tableCells[1], med.name));
                                cellRequests.push(createInsert(row.tableCells[2], med.dose));

                                if (med.frequency && med.frequency.trim() !== "") {
                                    mergeRequests.push({ mergeTableCells: { tableRange: { tableCellLocation: { tableStartLocation: { index: tableStartIndex }, rowIndex: rowIndex, columnIndex: 3 }, rowSpan: 1, columnSpan: 3 } } });
                                    cellRequests.push(createInsert(row.tableCells[3], med.frequency));
                                } else {
                                    if (med.freqMorning) cellRequests.push(createInsert(row.tableCells[3], "✔"));
                                    if (med.freqNoon) cellRequests.push(createInsert(row.tableCells[4], "✔"));
                                    if (med.freqNight) cellRequests.push(createInsert(row.tableCells[5], "✔"));
                                }
                                cellRequests.push(createInsert(row.tableCells[6], med.duration));
                                cellRequests.push(createInsert(row.tableCells[7], med.instructions));
                            }
                            rowIndex++;

                            if (med.notes && med.notes.trim() !== "") {
                                const notesRow = updatedTable.tableRows[rowIndex];
                                if (notesRow?.tableCells?.length >= 1) {
                                    const notesCellIndex = getCellInsertionIndex(notesRow.tableCells[0]);
                                    if (notesCellIndex !== null) {
                                        mergeRequests.push({ mergeTableCells: { tableRange: { tableCellLocation: { tableStartLocation: { index: tableStartIndex }, rowIndex: rowIndex, columnIndex: 0 }, rowSpan: 1, columnSpan: 8 } } });
                                        cellRequests.push({ updateTextStyle: { range: { startIndex: notesCellIndex, endIndex: notesCellIndex + med.notes.length }, textStyle: { fontSize: { magnitude: 10, unit: "PT" } }, fields: "fontSize" } });
                                        cellRequests.push({ insertText: { location: { index: notesCellIndex }, text: med.notes } });
                                    }
                                }
                                rowIndex++;
                            }
                        });
                        const allMedRequests = [...mergeRequests, ...cellRequests.filter(Boolean).reverse()];
                        if (allMedRequests.length > 0) {
                           await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ requests: allMedRequests })
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error processing medications:', error);
        }
    }

    const finalDocResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${docId}?fields=webViewLink`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
    if (!finalDocResponse.ok) throw new Error(`Failed to get document URL: ${finalDocResponse.statusText}`);
    const finalDocData = await finalDocResponse.json();

    if (finalFolderId && !folderId && templateId === "1Wm5gXKW1AwVcdQVmlekOSHN60u32QNIoqGpP_NyDlw4") {
        const { error: updateError } = await supabaseClient
          .from('patients')
          .update({ drive_id: finalFolderId })
          .eq('id', myId);
        if (updateError) console.error('Error updating patient with new drive_id:', updateError);
    }

    return new Response(JSON.stringify({ url: finalDocData.webViewLink, patientId: myId, driveId: finalFolderId }), {
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