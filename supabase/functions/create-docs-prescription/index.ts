import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getGoogleAccessToken } from "../_shared/google-auth.ts";
const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const today = new Date();
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Only POST allowed'
    }), {
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
  try {
    const data = await req.json();
    const accessToken = await getGoogleAccessToken();
    if (!accessToken) {
      return new Response(JSON.stringify({
        error: 'Missing Google access token'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    let templateId = data.templateId, myId = '';
    if (data.patientId) {
      myId = data.patientId;
    } else {
      myId = await generateIncrementalId(supabaseClient);
    }
    let parents;
    if (data.folderId) {
      parents = [
        data.folderId
      ];
    } else {
      let templateParent = null;
      try {
        const tplResp = await fetch(`https://www.googleapis.com/drive/v3/files/${templateId}?fields=parents`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        if (tplResp.ok) {
          const tpl = await tplResp.json();
          templateParent = tpl.parents?.[0] || null;
        }
      } catch (e) {
        console.warn('Could not fetch template parent:', e);
      }
      if (templateParent) {
        const createFolderResp = await fetch(`https://www.googleapis.com/drive/v3/files`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: data.name,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [
              templateParent
            ]
          })
        });
        if (createFolderResp.ok) {
          const folderData = await createFolderResp.json();
          parents = [
            folderData.id
          ];
        } else {
          console.warn('Could not create folder; file will be created in default location.');
        }
      } else {
        console.warn('Template parent not found; file will be created in default location.');
      }
    }
    const copyResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${templateId}/copy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: data.name,
        parents: parents
      })
    });
    if (!copyResponse.ok) throw new Error(`Failed to copy template: ${copyResponse.statusText}`);
    const copyData = await copyResponse.json();
    const docId = copyData.id;
    // Removed redundant document fetch for performance
    // Calculate age
    let age = '';
    if (data.dob) {
      const dob = new Date(data.dob);
      const currentAge = today.getFullYear() - dob.getFullYear() - (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
      age = currentAge.toString();
    }
    // Prepare replacement data
    const replacements = [
      {
        replaceAllText: {
          containsText: {
            text: '{{name}}'
          },
          replaceText: data.name || ''
        }
      },
      {
        replaceAllText: {
          containsText: {
            text: '{{dob}}'
          },
          replaceText: data.dob || ''
        }
      },
      {
        replaceAllText: {
          containsText: {
            text: '{{sex}}'
          },
          replaceText: data.sex || ''
        }
      },
      {
        replaceAllText: {
          containsText: {
            text: '{{phone}}'
          },
          replaceText: data.phone || ''
        }
      },
      {
        replaceAllText: {
          containsText: {
            text: '{{age}}'
          },
          replaceText: age
        }
      },
      {
        replaceAllText: {
          containsText: {
            text: '{{id}}'
          },
          replaceText: myId
        }
      },
      {
        replaceAllText: {
          containsText: {
            text: '{{date}}'
          },
          replaceText: today.toLocaleDateString('en-GB')
        }
      },
      {
        replaceAllText: {
          containsText: {
            text: '{{complaints}}'
          },
          replaceText: data.complaints || ''
        }
      },
      {
        replaceAllText: {
          containsText: {
            text: '{{findings}}'
          },
          replaceText: data.findings || ''
        }
      },
      {
        replaceAllText: {
          containsText: {
            text: '{{investigations}}'
          },
          replaceText: data.investigations || ''
        }
      },
      {
        replaceAllText: {
          containsText: {
            text: '{{diagnosis}}'
          },
          replaceText: data.diagnosis || ''
        }
      },
      {
        replaceAllText: {
          containsText: {
            text: '{{advice}}'
          },
          replaceText: data.advice || ''
        }
      },
      {
        replaceAllText: {
          containsText: {
            text: '{{followup}}'
          },
          replaceText: data.followup || ''
        }
      }
    ];
    const qrRequests = [];
    const waData = `https://ortho.life/auth?phone=${data.phone}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=76x76&data=${encodeURIComponent(waData)}`;
    try {
      const qrDocResponse = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      if (!qrDocResponse.ok) throw new Error('Failed to fetch document for QR code placement');
      const qrDoc = await qrDocResponse.json();
      const findTextInContent = (content, searchText)=>{
        for (const element of content){
          if (element.paragraph?.elements) {
            for (const textElement of element.paragraph.elements){
              if (textElement.textRun?.content?.includes(searchText)) {
                const textContent = textElement.textRun.content;
                const textStartIndex = textElement.startIndex;
                const placeholderStart = textContent.indexOf(searchText);
                return {
                  index: textStartIndex + placeholderStart,
                  length: searchText.length
                };
              }
            }
          }
        }
        return null;
      };
      const qrLoc = findTextInContent(qrDoc.body.content, '{{waqr}}');
      const qrResponse = await fetch(qrUrl);
      if (qrResponse.ok && qrLoc) {
        const qrArrayBuffer = await qrResponse.arrayBuffer();
        const qrBase64 = btoa(String.fromCharCode(...new Uint8Array(qrArrayBuffer)));
        qrRequests.push({
          deleteContentRange: {
            range: {
              startIndex: qrLoc.index,
              endIndex: qrLoc.index + qrLoc.length
            }
          }
        });
        qrRequests.push({
          insertInlineImage: {
            location: {
              index: qrLoc.index
            },
            uri: `data:image/png;base64,${qrBase64}`,
            objectSize: {
              height: {
                magnitude: 76,
                unit: 'PT'
              },
              width: {
                magnitude: 76,
                unit: 'PT'
              }
            }
          }
        });
      } else {
        replacements.push({
          replaceAllText: {
            containsText: {
              text: '{{waqr}}'
            },
            replaceText: 'QR Code'
          }
        });
      }
    } catch (qrError) {
      console.error('Error handling QR code:', qrError);
      replacements.push({
        replaceAllText: {
          containsText: {
            text: '{{waqr}}'
          },
          replaceText: 'QR Code'
        }
      });
    }
    const allRequests = [
      ...qrRequests,
      ...replacements
    ];
    if (allRequests.length > 0) {
      const batchUpdateResponse = await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: allRequests
        })
      });
      if (!batchUpdateResponse.ok) {
        throw new Error(`Failed to update document: ${batchUpdateResponse.statusText}`);
      }
    }
    if (data.medications) {
      try {
        const medsRaw = data.medications;
        const meds = Array.isArray(medsRaw) ? medsRaw : JSON.parse(medsRaw);
        if (meds.length > 0) {
          const docResponse = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });
          if (!docResponse.ok) throw new Error(`Failed to fetch document: ${docResponse.statusText}`);
          const doc = await docResponse.json();
          let table, tableStartIndex = -1;
          for (const element of doc.body.content)if (element.table) {
            table = element.table;
            tableStartIndex = element.startIndex;
            break;
          }
          if (table && tableStartIndex !== -1) {
            const insertRowRequests = meds.flatMap(med => {
              const requests = [{
                insertTableRow: {
                  tableCellLocation: {
                    tableStartLocation: {
                      index: tableStartIndex
                    },
                    rowIndex: table.tableRows.length - 1,
                    columnIndex: 0
                  },
                  insertBelow: true
                }
              }];
              if (med.notes && med.notes.trim() !== "") {
                requests.push({
                  insertTableRow: {
                    tableCellLocation: {
                      tableStartLocation: {
                        index: tableStartIndex
                      },
                      rowIndex: table.tableRows.length,
                      columnIndex: 0
                    },
                    insertBelow: true
                  }
                });
              }
              return requests;
            });
            if (insertRowRequests.length > 0) {
              const insertResponse = await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  requests: insertRowRequests
                })
              });
              if (!insertResponse.ok) throw new Error(`Failed to insert table rows: ${insertResponse.statusText}`);
            }
            const finalDocResponse = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            });
            if (!finalDocResponse.ok) throw new Error(`Failed to fetch updated document: ${finalDocResponse.statusText}`);
            const finalDoc = await finalDocResponse.json();
            let updatedTable;
            for (const element of finalDoc.body.content)if (element.table) {
              updatedTable = element.table;
              break;
            }
            if (updatedTable) {
              const cellRequests = [];
              const mergeRequests = [];
              let rowIndex = updatedTable.tableRows.length - meds.reduce((acc, med) => acc + (med.notes && med.notes.trim() !== "" ? 2 : 1), 0);
              const getCellInsertionIndex = (cell)=>{
                if (!cell?.content?.[0]?.paragraph) return null;
                const paragraph = cell.content[0].paragraph;
                if (paragraph.elements) for (const element of paragraph.elements)if (element.textRun) return element.startIndex;
                if (paragraph.elements?.[0]?.startIndex !== undefined) return paragraph.elements[0].startIndex;
                return null;
              };
              meds.forEach((med, medIndex)=>{
                const row = updatedTable.tableRows[rowIndex];
                if (row?.tableCells?.length >= 8) {
                  const createInsertTextRequest = (cell, text)=>{
                    const index = getCellInsertionIndex(cell);
                    if (index !== null && text) return {
                      insertText: {
                        location: {
                          index
                        },
                        text
                      }
                    };
                    return null;
                  };
                  cellRequests.push(createInsertTextRequest(row.tableCells[0], (medIndex + 1).toString()));
                  cellRequests.push(createInsertTextRequest(row.tableCells[1], med.name));
                  cellRequests.push(createInsertTextRequest(row.tableCells[2], med.dose));
                  if (med.frequency && med.frequency.trim() !== "") {
                    mergeRequests.push({
                      mergeTableCells: {
                        tableRange: {
                          tableCellLocation: {
                            tableStartLocation: {
                              index: tableStartIndex
                            },
                            rowIndex: rowIndex,
                            columnIndex: 3
                          },
                          rowSpan: 1,
                          columnSpan: 3
                        }
                      }
                    });
                    cellRequests.push(createInsertTextRequest(row.tableCells[3], med.frequency));
                  } else {
                    if (med.freqMorning === true || med.freqMorning === "true") cellRequests.push(createInsertTextRequest(row.tableCells[3], "✔"));
                    if (med.freqNoon === true || med.freqNoon === "true") cellRequests.push(createInsertTextRequest(row.tableCells[4], "✔"));
                    if (med.freqNight === true || med.freqNight === "true") cellRequests.push(createInsertTextRequest(row.tableCells[5], "✔"));
                  }
                  cellRequests.push(createInsertTextRequest(row.tableCells[6], med.duration));
                  cellRequests.push(createInsertTextRequest(row.tableCells[7], med.instructions));
                } else console.error(`Row ${rowIndex} does not have enough cells or is malformed`);
                rowIndex++;
                if (med.notes && med.notes.trim() !== "") {
                  const notesRow = updatedTable.tableRows[rowIndex];
                  if (notesRow?.tableCells?.length >= 1) {
                    const notesCellIndex = getCellInsertionIndex(notesRow.tableCells[0]);
                    if (notesCellIndex !== null) {
                      mergeRequests.push({
                        mergeTableCells: {
                          tableRange: {
                            tableCellLocation: {
                              tableStartLocation: {
                                index: tableStartIndex
                              },
                              rowIndex: rowIndex,
                              columnIndex: 0
                            },
                            rowSpan: 1,
                            columnSpan: 8
                          }
                        }
                      });
                      cellRequests.push({
                        insertText: {
                          location: {
                            index: notesCellIndex
                          },
                          text: med.notes
                        }
                      });
                      cellRequests.push({
                        updateTextStyle: {
                          range: {
                            startIndex: notesCellIndex,
                            endIndex: notesCellIndex + med.notes.length
                          },
                          textStyle: {
                            fontSize: {
                              magnitude: 10,
                              unit: "PT"
                            }
                          },
                          fields: "fontSize"
                        }
                      });
                    }
                  }
                  rowIndex++;
                }
              });
              const validCellRequests = cellRequests.filter(Boolean).reverse();
              const allMedRequests = [
                ...mergeRequests,
                ...validCellRequests
              ];
              if (allMedRequests.length > 0) {
                const populateResponse = await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    requests: allMedRequests
                  })
                });
                if (!populateResponse.ok) console.error(`Failed to populate cells: ${populateResponse.statusText}`, await populateResponse.text());
              }
            } else console.error('Could not find updated table after row insertion');
          } else console.error('No table found in document');
        }
      } catch (error) {
        console.error('Error processing medications:', error);
      }
    }
    // Get the document URL
    const finalDocResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${docId}?fields=webViewLink`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    if (!finalDocResponse.ok) {
      throw new Error(`Failed to get document URL: ${finalDocResponse.statusText}`);
    }
    const finalDocData = await finalDocResponse.json();
    const url = finalDocData.webViewLink;
    return new Response(JSON.stringify({
      url,
      patientId: myId
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
      }
    });
  }
});
async function generateIncrementalId(supabaseClient) {
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const dateKey = `${yyyy}${mm}${dd}`;
  try {
    const { data, error } = await supabaseClient.rpc('increment_patient_counter', {
      input_date_key: dateKey
    });
    if (error) throw error;
    const counter = data || 1;
    return `${dateKey}${counter}`;
  } catch (error) {
    console.error('Error generating incremental ID:', error);
    // Fallback to timestamp-based ID
    const timestamp = Date.now().toString().slice(-3);
    return `${dateKey}${timestamp}`;
  }
}
