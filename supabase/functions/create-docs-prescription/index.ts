import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getGoogleAccessToken } from "../_shared/google-auth.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const templateId = '1AT025Qq_HbkSEWYHE1okVSG_Fu7qGwzP00HuNHypiNs';
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
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    // Generate unique ID for new patient
    let myId = '';
    if (data.patientId) {
      myId = data.patientId;
    } else {
      const randomId = Math.floor(Math.random() * 1000) + 1;
      myId = `${yyyy}${mm}${dd}${randomId}`;
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
    // Handle medications table
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
            const tableRequests = [];
            // Insert rows for each medication
            for(let i = 0; i < meds.length; i++){
              tableRequests.push({
                insertTableRow: {
                  tableCellLocation: {
                    tableStartLocation: {
                      index: tableStartIndex
                    },
                    rowIndex: table.tableRows.length,
                    columnIndex: 0
                  },
                  insertBelow: false
                }
              });
            }
            // Execute row insertions first
            if (tableRequests.length > 0) {
              await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  requests: tableRequests
                })
              });
              // Get the document again to get updated table structure with new rows
              const finalDocResponse = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
                headers: {
                  'Authorization': `Bearer ${accessToken}`
                }
              });
              const finalDoc = await finalDocResponse.json();
              let updatedTable = null;
              for (const element of finalDoc.body.content){
                if (element.table) {
                  updatedTable = element.table;
                  break;
                }
              }
              if (updatedTable) {
                const cellRequests = [];
                // Populate cells for each medication
                meds.forEach((med, medIndex)=>{
                  const rowIndex = updatedTable.tableRows.length - meds.length + medIndex;
                  const row = updatedTable.tableRows[rowIndex];
                  if (row && row.tableCells) {
                    // Column 0: Serial number (N)
                    if (row.tableCells[0]?.content?.[0]?.paragraph) {
                      const cellStart = row.tableCells[0].content[0].startIndex + 1;
                      cellRequests.push({
                        insertText: {
                          location: {
                            index: cellStart
                          },
                          text: (medIndex + 3).toString() // Starting from 3 as per original code
                        }
                      });
                    }
                    // Column 1: Medicine Name
                    if (row.tableCells[1]?.content?.[0]?.paragraph && med.name) {
                      const cellStart = row.tableCells[1].content[0].startIndex + 1;
                      cellRequests.push({
                        insertText: {
                          location: {
                            index: cellStart
                          },
                          text: med.name
                        }
                      });
                    }
                    // Column 2: Dose
                    if (row.tableCells[2]?.content?.[0]?.paragraph && med.dose) {
                      const cellStart = row.tableCells[2].content[0].startIndex + 1;
                      cellRequests.push({
                        insertText: {
                          location: {
                            index: cellStart
                          },
                          text: med.dose
                        }
                      });
                    }
                    // Column 3: Morning frequency
                    if (row.tableCells[3]?.content?.[0]?.paragraph && (med.freqMorning === true || med.freqMorning === 'true')) {
                      const cellStart = row.tableCells[3].content[0].startIndex + 1;
                      cellRequests.push({
                        insertText: {
                          location: {
                            index: cellStart
                          },
                          text: '✔'
                        }
                      });
                    }
                    // Column 4: Noon frequency  
                    if (row.tableCells[4]?.content?.[0]?.paragraph && (med.freqNoon === true || med.freqNoon === 'true')) {
                      const cellStart = row.tableCells[4].content[0].startIndex + 1;
                      cellRequests.push({
                        insertText: {
                          location: {
                            index: cellStart
                          },
                          text: '✔'
                        }
                      });
                    }
                    // Column 5: Night frequency
                    if (row.tableCells[5]?.content?.[0]?.paragraph && (med.freqNight === true || med.freqNight === 'true')) {
                      const cellStart = row.tableCells[5].content[0].startIndex + 1;
                      cellRequests.push({
                        insertText: {
                          location: {
                            index: cellStart
                          },
                          text: '✔'
                        }
                      });
                    }
                    // Column 6: Duration
                    if (row.tableCells[6]?.content?.[0]?.paragraph && med.duration) {
                      const cellStart = row.tableCells[6].content[0].startIndex + 1;
                      cellRequests.push({
                        insertText: {
                          location: {
                            index: cellStart
                          },
                          text: med.duration
                        }
                      });
                    }
                    // Column 7: Instructions
                    if (row.tableCells[7]?.content?.[0]?.paragraph && med.instructions) {
                      const cellStart = row.tableCells[7].content[0].startIndex + 1;
                      cellRequests.push({
                        insertText: {
                          location: {
                            index: cellStart
                          },
                          text: med.instructions
                        }
                      });
                    }
                  }
                });
                // Execute cell population
                if (cellRequests.length > 0) {
                  await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${accessToken}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      requests: cellRequests.reverse() // Reverse to maintain correct indices
                    })
                  });
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error processing medications:', error);
      }
    }
    // Handle QR code and WhatsApp link
    const waData = `https://wa.me/919866812555?text=Hi,\nI'd like to order medicines for prescription id ${myId}`;
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
        function findTextInContent(content: any[], searchText: string) {
          for (let i = 0; i < content.length; i++) {
            const element = content[i];
            if (element.paragraph?.elements) {
              for (const textElement of element.paragraph.elements) {
                if (textElement.textRun?.content?.includes(searchText)) {
                  const textContent = textElement.textRun.content as string;
                  const textStartIndex = textElement.startIndex as number;
                  const placeholderStart = textContent.indexOf(searchText);
                  return { index: textStartIndex + placeholderStart };
                }
              }
            }
          }
          return null;
        }
        const qrLoc = findTextInContent(qrDoc.body.content, '{{waqr}}');
        const whatsappLoc = findTextInContent(qrDoc.body.content, 'WhatsApp');
        if (qrLoc) {
          const qrPlaceholderIndex = qrLoc.index;
          const requests: any[] = [];
          // Insert the image at the placeholder
          requests.push({
            insertInlineImage: {
              location: { index: qrPlaceholderIndex },
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
          // Update the WhatsApp link if present
          if (whatsappLoc) {
            requests.push({
              updateTextStyle: {
                range: { startIndex: whatsappLoc.index, endIndex: whatsappLoc.index + 8 },
                textStyle: { link: { url: waData } },
                fields: 'link'
              }
            });
          }
          await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ requests })
          });
        }
      }
      // WhatsApp link update handled in the same batchUpdate as QR insertion for performance
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
