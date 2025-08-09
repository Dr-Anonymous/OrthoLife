import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getGoogleAccessToken } from "../_shared/google-auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const templateId = '1AT025Qq_HbkSEWYHE1okVSG_Fu7qGwzP00HuNHypiNs';

interface MedicationData {
  name?: string;
  dose?: string;
  freqMorning?: string;
  freqNoon?: string;
  freqNight?: string;
  duration?: string;
  instructions?: string;
}

interface RequestData {
  name?: string;
  dob?: string;
  sex?: string;
  phone?: string;
  patientId?: string;
  complaints?: string;
  findings?: string;
  investigations?: string;
  diagnosis?: string;
  advice?: string;
  medications?: string;
  folderId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Only POST allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const data: RequestData = await req.json();
    const accessToken = await getGoogleAccessToken();
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'Missing Google access token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
        name: data.name || 'Medical Document'
      })
    });

    if (!copyResponse.ok) {
      throw new Error(`Failed to copy template: ${copyResponse.statusText}`);
    }

    const copyData = await copyResponse.json();
    const docId = copyData.id;

    // Get the document content
    const docResponse = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!docResponse.ok) {
      throw new Error(`Failed to get document: ${docResponse.statusText}`);
    }

    // Calculate age
    let age = '';
    if (data.dob) {
      const dob = new Date(data.dob);
      const currentAge = today.getFullYear() - dob.getFullYear() -
        (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
      age = currentAge.toString();
    }

    // Prepare replacement data
    const replacements = [
      { replaceAllText: { containsText: { text: '{{name}}' }, replaceText: data.name || '' } },
      { replaceAllText: { containsText: { text: '{{dob}}' }, replaceText: data.dob || '' } },
      { replaceAllText: { containsText: { text: '{{sex}}' }, replaceText: data.sex || '' } },
      { replaceAllText: { containsText: { text: '{{phone}}' }, replaceText: data.phone || '' } },
      { replaceAllText: { containsText: { text: '{{age}}' }, replaceText: age } },
      { replaceAllText: { containsText: { text: '{{id}}' }, replaceText: myId } },
      { replaceAllText: { containsText: { text: '{{date}}' }, replaceText: today.toLocaleDateString('en-GB') } },
      { replaceAllText: { containsText: { text: '{{complaints}}' }, replaceText: data.complaints || '' } },
      { replaceAllText: { containsText: { text: '{{findings}}' }, replaceText: data.findings || '' } },
      { replaceAllText: { containsText: { text: '{{investigations}}' }, replaceText: data.investigations || '' } },
      { replaceAllText: { containsText: { text: '{{diagnosis}}' }, replaceText: data.diagnosis || '' } },
      { replaceAllText: { containsText: { text: '{{advice}}' }, replaceText: data.advice || '' } }
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
        const meds: MedicationData[] = JSON.parse(data.medications);
        
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
          
          for (const element of updatedDoc.body.content) {
            if (element.table) {
              table = element.table;
              tableStartIndex = element.startIndex;
              break;
            }
          }

          if (table && tableStartIndex !== -1) {
            const tableRequests = [];
            
            // Insert rows for each medication
            for (let i = 0; i < meds.length; i++) {
              tableRequests.push({
                insertTableRow: {
                  tableCellLocation: {
                    tableStartLocation: { index: tableStartIndex },
                    rowIndex: table.tableRows.length, // Insert at end
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
              
              for (const element of finalDoc.body.content) {
                if (element.table) {
                  updatedTable = element.table;
                  break;
                }
              }

              if (updatedTable) {
                const cellRequests = [];
                
                // Populate cells for each medication
                meds.forEach((med, medIndex) => {
                  const rowIndex = updatedTable.tableRows.length - meds.length + medIndex;
                  const row = updatedTable.tableRows[rowIndex];
                  
                  if (row && row.tableCells) {
                    // Column 0: Serial number (N)
                    if (row.tableCells[0]?.content?.[0]?.paragraph) {
                      const cellStart = row.tableCells[0].content[0].startIndex + 1;
                      cellRequests.push({
                        insertText: {
                          location: { index: cellStart },
                          text: (medIndex + 3).toString() // Starting from 3 as per original code
                        }
                      });
                    }

                    // Column 1: Medicine Name
                    if (row.tableCells[1]?.content?.[0]?.paragraph && med.name) {
                      const cellStart = row.tableCells[1].content[0].startIndex + 1;
                      cellRequests.push({
                        insertText: {
                          location: { index: cellStart },
                          text: med.name
                        }
                      });
                    }

                    // Column 2: Dose
                    if (row.tableCells[2]?.content?.[0]?.paragraph && med.dose) {
                      const cellStart = row.tableCells[2].content[0].startIndex + 1;
                      cellRequests.push({
                        insertText: {
                          location: { index: cellStart },
                          text: med.dose
                        }
                      });
                    }

                    // Column 3: Morning frequency
                    if (row.tableCells[3]?.content?.[0]?.paragraph && med.freqMorning === 'true') {
                      const cellStart = row.tableCells[3].content[0].startIndex + 1;
                      cellRequests.push({
                        insertText: {
                          location: { index: cellStart },
                          text: '✔'
                        }
                      });
                    }

                    // Column 4: Noon frequency  
                    if (row.tableCells[4]?.content?.[0]?.paragraph && med.freqNoon === 'true') {
                      const cellStart = row.tableCells[4].content[0].startIndex + 1;
                      cellRequests.push({
                        insertText: {
                          location: { index: cellStart },
                          text: '✔'
                        }
                      });
                    }

                    // Column 5: Night frequency
                    if (row.tableCells[5]?.content?.[0]?.paragraph && med.freqNight === 'true') {
                      const cellStart = row.tableCells[5].content[0].startIndex + 1;
                      cellRequests.push({
                        insertText: {
                          location: { index: cellStart },
                          text: '✔'
                        }
                      });
                    }

                    // Column 6: Duration
                    if (row.tableCells[6]?.content?.[0]?.paragraph && med.duration) {
                      const cellStart = row.tableCells[6].content[0].startIndex + 1;
                      cellRequests.push({
                        insertText: {
                          location: { index: cellStart },
                          text: med.duration
                        }
                      });
                    }

                    // Column 7: Instructions
                    if (row.tableCells[7]?.content?.[0]?.paragraph && med.instructions) {
                      const cellStart = row.tableCells[7].content[0].startIndex + 1;
                      cellRequests.push({
                        insertText: {
                          location: { index: cellStart },
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
        
        // Find the QR placeholder text
        let qrPlaceholderIndex = -1;
        let qrElementIndex = -1;
        
        function findTextInContent(content: any[], searchText: string): { index: number, elementIndex: number } | null {
          for (let i = 0; i < content.length; i++) {
            const element = content[i];
            if (element.paragraph?.elements) {
              for (const textElement of element.paragraph.elements) {
                if (textElement.textRun?.content?.includes(searchText)) {
                  const textContent = textElement.textRun.content;
                  const textStartIndex = textElement.startIndex;
                  const placeholderStart = textContent.indexOf(searchText);
                  return {
                    index: textStartIndex + placeholderStart,
                    elementIndex: textStartIndex
                  };
                }
              }
            }
          }
          return null;
        }

        const qrLocation = findTextInContent(qrDoc.body.content, '{{waqr}}');
        
        if (qrLocation) {
          qrPlaceholderIndex = qrLocation.index;
          qrElementIndex = qrLocation.elementIndex;

          // First, insert the image
          const insertImageRequest = {
            insertInlineImage: {
              location: { index: qrPlaceholderIndex },
              uri: `data:image/png;base64,${qrBase64}`,
              objectSize: {
                height: { magnitude: 76, unit: 'PT' },
                width: { magnitude: 76, unit: 'PT' }
              }
            }
          };

          // Then delete the placeholder text
          const deleteTextRequest = {
            deleteContentRange: {
              range: {
                startIndex: qrPlaceholderIndex + 1, // After the image
                endIndex: qrPlaceholderIndex + 1 + 8 // Length of '{{waqr}}'
              }
            }
          };

          // Execute both requests
          await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              requests: [insertImageRequest, deleteTextRequest]
            })
          });
        }
      }

      // Update WhatsApp link
      // Get document again to find WhatsApp text after QR insertion
      const whatsappDocResponse = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const whatsappDoc = await whatsappDocResponse.json();
      
      function findWhatsAppText(content: any[]): { startIndex: number, endIndex: number } | null {
        for (const element of content) {
          if (element.paragraph?.elements) {
            for (const textElement of element.paragraph.elements) {
              if (textElement.textRun?.content?.includes('WhatsApp')) {
                const textContent = textElement.textRun.content;
                const textStartIndex = textElement.startIndex;
                const whatsappStart = textContent.indexOf('WhatsApp');
                return {
                  startIndex: textStartIndex + whatsappStart,
                  endIndex: textStartIndex + whatsappStart + 8 // Length of 'WhatsApp'
                };
              }
            }
          }
        }
        return null;
      }

      const whatsappLocation = findWhatsAppText(whatsappDoc.body.content);
      
      if (whatsappLocation) {
        // Update the link
        const updateLinkRequest = {
          updateTextStyle: {
            range: {
              startIndex: whatsappLocation.startIndex,
              endIndex: whatsappLocation.endIndex
            },
            textStyle: {
              link: {
                url: waData
              }
            },
            fields: 'link'
          }
        };

        await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            requests: [updateLinkRequest]
          })
        });
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
          requests: [{
            replaceAllText: {
              containsText: { text: '{{waqr}}' },
              replaceText: 'QR Code'
            }
          }]
        })
      });
    }

    // Move file to target folder if specified
    if (data.folderId) {
      // Get current parents
      const fileResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${docId}?fields=parents`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (fileResponse.ok) {
        const fileData = await fileResponse.json();
        const previousParents = fileData.parents?.join(',');
        
        // Move to new folder
        await fetch(`https://www.googleapis.com/drive/v3/files/${docId}?addParents=${data.folderId}&removeParents=${previousParents}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
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

    return new Response(
      JSON.stringify({ url, patientId: myId }),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
        }
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
        }
      }
    );
  }
});

// CORS preflight is handled in the main handler above.
