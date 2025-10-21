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
    // Copy the template file
    const copyResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${templateId}/copy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: data.name
      })
    });
    if (!copyResponse.ok) {
      throw new Error(`Failed to copy template: ${copyResponse.statusText}`);
    }
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
    // Apply text replacements
    const batchUpdateResponse = await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: replacements
      })
    });
    if (!batchUpdateResponse.ok) {
      throw new Error(`Failed to update document: ${batchUpdateResponse.statusText}`);
    }
    if (data.medications) {
      try {
        const medsRaw = data.medications;
        const meds = Array.isArray(medsRaw) ? medsRaw : JSON.parse(medsRaw);
        if (meds.length > 0) {
          // Get updated document to find table
          const updatedDocResponse = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });
          if (!updatedDocResponse.ok) {
            throw new Error(`Failed to fetch document: ${updatedDocResponse.statusText}`);
          }
          const updatedDoc = await updatedDocResponse.json();
          // Find the first table in the document
          let table = null;
          let tableStartIndex = -1;
          for (const element of updatedDoc.body.content){
            if (element.table) {
              table = element.table;
              tableStartIndex = element.startIndex;
              break;
            }
          }
          if (table && tableStartIndex !== -1) {
            //console.log(`Found table with ${table.tableRows.length} rows at index ${tableStartIndex}`);
            // Insert rows one by one to avoid batch issues
            let currentRowCount = table.tableRows.length;
            for(let i = 0; i < meds.length; i++){
              const insertRowRequest = {
                insertTableRow: {
                  tableCellLocation: {
                    tableStartLocation: {
                      index: tableStartIndex
                    },
                    rowIndex: currentRowCount - 1,
                    columnIndex: 0
                  },
                  insertBelow: true
                }
              };
              //console.log(`Inserting row ${i + 1} of ${meds.length}`);
              const insertResponse = await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  requests: [
                    insertRowRequest
                  ]
                })
              });
              if (!insertResponse.ok) {
                const errorText = await insertResponse.text();
                console.error(`Failed to insert row ${i + 1}: ${insertResponse.status} ${insertResponse.statusText}`, errorText);
                throw new Error(`Failed to insert table row ${i + 1}: ${insertResponse.statusText}`);
              }
              currentRowCount++; // Increment for next iteration
              // Small delay to avoid rate limiting
              await new Promise((resolve)=>setTimeout(resolve, 100));
            }
            // Now get the updated document to populate cells
            const finalDocResponse = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            });
            if (!finalDocResponse.ok) {
              throw new Error(`Failed to fetch updated document: ${finalDocResponse.statusText}`);
            }
            const finalDoc = await finalDocResponse.json();
            // Find the updated table
            let updatedTable = null;
            for (const element of finalDoc.body.content){
              if (element.table) {
                updatedTable = element.table;
                break;
              }
            }
            if (updatedTable) {
              //console.log(`Updated table now has ${updatedTable.tableRows.length} rows`);
              // Populate cells for each medication
              const cellRequests = [];
              // Calculate starting row index (skip header rows)
              const startingRowIndex = updatedTable.tableRows.length - meds.length;
              for(let medIndex = 0; medIndex < meds.length; medIndex++){
                const med = meds[medIndex];
                const rowIndex = startingRowIndex + medIndex;
                const row = updatedTable.tableRows[rowIndex];
                //console.log(`Processing medication ${medIndex + 1}: ${med.name} in row ${rowIndex}`);
                if (row && row.tableCells && row.tableCells.length >= 8) {
                  // Helper function to get valid insertion index for a cell
                  const getCellInsertionIndex = (cell)=>{
                    if (!cell || !cell.content || !cell.content[0] || !cell.content[0].paragraph) {
                      return null;
                    }
                    const paragraph = cell.content[0].paragraph;
                    // Check if paragraph has elements with text
                    if (paragraph.elements && paragraph.elements.length > 0) {
                      // Find the first text run or use the paragraph's start index + 1
                      for (const element of paragraph.elements){
                        if (element.textRun) {
                          return element.startIndex;
                        }
                      }
                    }
                    // Fallback: use paragraph start index + 1 if it exists
                    if (paragraph.elements && paragraph.elements[0] && paragraph.elements[0].startIndex !== undefined) {
                      return paragraph.elements[0].startIndex;
                    }
                    return null;
                  };
                  // Column 0: Serial number
                  const col0Index = getCellInsertionIndex(row.tableCells[0]);
                  if (col0Index !== null) {
                    cellRequests.push({
                      insertText: {
                        location: {
                          index: col0Index
                        },
                        text: (medIndex + 1).toString()
                      }
                    });
                  }
                  // Column 1: Medicine Name
                  const col1Index = getCellInsertionIndex(row.tableCells[1]);
                  if (col1Index !== null && med.name) {
                    cellRequests.push({
                      insertText: {
                        location: {
                          index: col1Index
                        },
                        text: med.name
                      }
                    });
                  }
                  // Column 2: Dose
                  const col2Index = getCellInsertionIndex(row.tableCells[2]);
                  if (col2Index !== null && med.dose) {
                    cellRequests.push({
                      insertText: {
                        location: {
                          index: col2Index
                        },
                        text: med.dose
                      }
                    });
                  }
                  // Column 3: Morning frequency
                  const col3Index = getCellInsertionIndex(row.tableCells[3]);
                  if (col3Index !== null && (med.freqMorning === true || med.freqMorning === 'true')) {
                    cellRequests.push({
                      insertText: {
                        location: {
                          index: col3Index
                        },
                        text: '✔'
                      }
                    });
                  }
                  // Column 4: Noon frequency  
                  const col4Index = getCellInsertionIndex(row.tableCells[4]);
                  if (col4Index !== null && (med.freqNoon === true || med.freqNoon === 'true')) {
                    cellRequests.push({
                      insertText: {
                        location: {
                          index: col4Index
                        },
                        text: '✔'
                      }
                    });
                  }
                  // Column 5: Night frequency
                  const col5Index = getCellInsertionIndex(row.tableCells[5]);
                  if (col5Index !== null && (med.freqNight === true || med.freqNight === 'true')) {
                    cellRequests.push({
                      insertText: {
                        location: {
                          index: col5Index
                        },
                        text: '✔'
                      }
                    });
                  }
                  // Column 6: Duration
                  const col6Index = getCellInsertionIndex(row.tableCells[6]);
                  if (col6Index !== null && med.duration) {
                    cellRequests.push({
                      insertText: {
                        location: {
                          index: col6Index
                        },
                        text: med.duration
                      }
                    });
                  }
                  // Column 7: Instructions
                  const col7Index = getCellInsertionIndex(row.tableCells[7]);
                  if (col7Index !== null && med.instructions) {
                    cellRequests.push({
                      insertText: {
                        location: {
                          index: col7Index
                        },
                        text: med.instructions
                      }
                    });
                  }
                } else {
                  console.error(`Row ${rowIndex} does not have enough cells or is malformed`);
                }
              }
              if (cellRequests.length > 0) {
                //console.log(`Populating ${cellRequests.length} cells`);
                // Process in reverse order to maintain correct indices and in smaller batches
                const batchSize = 20;
                const reversedRequests = cellRequests.reverse();
                for(let i = 0; i < reversedRequests.length; i += batchSize){
                  const batch = reversedRequests.slice(i, i + batchSize);
                  const populateResponse = await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${accessToken}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      requests: batch
                    })
                  });
                  if (!populateResponse.ok) {
                    const errorText = await populateResponse.text();
                    console.error(`Failed to populate cells batch ${Math.floor(i / batchSize) + 1}: ${populateResponse.status} ${populateResponse.statusText}`, errorText);
                  // Don't throw error, just log and continue with next batch
                  } else {
                  //console.log(`Successfully populated batch ${Math.floor(i / batchSize) + 1}`);
                  }
                  // Add delay between batches
                  await new Promise((resolve)=>setTimeout(resolve, 200));
                }
              }
            } else {
              console.error('Could not find updated table after row insertion');
            }
          } else {
            console.error('No table found in document');
          }
        }
      } catch (error) {
        console.error('Error processing medications:', error);
      // Don't throw error, just log and continue - the rest of the prescription will still be created
      }
    }
    // Handle QR code and WhatsApp link
    const waData = `https://ortho.life/auth?phone=${data.phone}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=76x76&data=${encodeURIComponent(waData)}`;
    try {
      // Fetch QR code image
      const qrResponse = await fetch(qrUrl);
      if (qrResponse.ok) {
        const qrArrayBuffer = await qrResponse.arrayBuffer();
        const qrBase64 = btoa(String.fromCharCode(...new Uint8Array(qrArrayBuffer)));
        // Get the document to find QR placeholder
        const qrDocResponse = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        const qrDoc = await qrDocResponse.json();
        // Find the QR placeholder text and the 'WhatsApp' text, then perform a single batch update
        function findTextInContent(content, searchText) {
          for(let i = 0; i < content.length; i++){
            const element = content[i];
            if (element.paragraph?.elements) {
              for (const textElement of element.paragraph.elements){
                if (textElement.textRun?.content?.includes(searchText)) {
                  const textContent = textElement.textRun.content;
                  const textStartIndex = textElement.startIndex;
                  const placeholderStart = textContent.indexOf(searchText);
                  return {
                    index: textStartIndex + placeholderStart
                  };
                }
              }
            }
          }
          return null;
        }
        const qrLoc = findTextInContent(qrDoc.body.content, '{{waqr}}');
        if (qrLoc) {
          const qrPlaceholderIndex = qrLoc.index;
          const requests = [];
          // Insert the image at the placeholder
          requests.push({
            insertInlineImage: {
              location: {
                index: qrPlaceholderIndex
              },
              uri: `data:image/png;base64,${qrBase64}`
            }
          });
          // Delete the placeholder text '{{waqr}}'
          requests.push({
            deleteContentRange: {
              range: {
                startIndex: qrPlaceholderIndex + 1,
                endIndex: qrPlaceholderIndex + 1 + 8
              }
            }
          });
          await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              requests
            })
          });
        }
      }
    } catch (qrError) {
      console.error('Error handling QR code:', qrError);
      // Fallback: just remove the placeholder text
      await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [
            {
              replaceAllText: {
                containsText: {
                  text: '{{waqr}}'
                },
                replaceText: 'QR Code'
              }
            }
          ]
        })
      });
    }
    // Move file to target folder if specified
    let previousParents = [];
    try {
      const fileMetaResp = await fetch(`https://www.googleapis.com/drive/v3/files/${docId}?fields=parents`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      if (fileMetaResp.ok) {
        const fileMeta = await fileMetaResp.json();
        previousParents = fileMeta.parents || [];
      }
    } catch (e) {
      console.warn('Could not fetch file parents:', e);
    }
    if (data.folderId) {
      const removed = previousParents.length ? previousParents.join(',') : '';
      const patchUrl = `https://www.googleapis.com/drive/v3/files/${docId}?addParents=${data.folderId}${removed ? `&removeParents=${removed}` : ''}`;
      await fetch(patchUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
    } else {
      // create a folder in the template's parent folder
      // get template parents
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
      } catch (e) {}
      if (templateParent) {
        // create folder
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
          const folderId = folderData.id;
          const removed = previousParents.length ? previousParents.join(',') : '';
          const patchUrl = `https://www.googleapis.com/drive/v3/files/${docId}?addParents=${folderId}${removed ? `&removeParents=${removed}` : ''}`;
          await fetch(patchUrl, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });
        } else {
          console.warn('Could not create folder; skipping move to new folder.');
        }
      } else {
        console.warn('Template parent not found; skipping create-folder behaviour.');
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
