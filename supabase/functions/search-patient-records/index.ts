import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getGoogleAccessToken } from "../_shared/google-auth.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// Removed global mutable result; using per-request response objects
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const { phoneNumber, selectedFolder } = await req.json();
    console.log('Request data:', {
      phoneNumber,
      selectedFolder
    });
    if (!phoneNumber && !selectedFolder) {
      return new Response(JSON.stringify({
        error: 'Phone number or selected folder is required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
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
    let responseBody = {};
    if (phoneNumber && !selectedFolder) {
      responseBody.patientFolders = await searchPhoneNumber(accessToken, phoneNumber);
    } else if (selectedFolder) {
      const { folderId, patientData } = await getLatestPrescriptionData(accessToken, selectedFolder);
      responseBody = {
        folderId,
        patientData
      };
    }
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in search patient records:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
async function searchPhoneNumber(accessToken, phoneNumber) {
  console.log('Searching for phone number using optimized fullText search:', phoneNumber);
  try {
    const searchQuery = encodeURIComponent(`fullText contains '${phoneNumber}' and mimeType='application/vnd.google-apps.document'`);
    const searchResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=${searchQuery}&fields=files(id,name,parents)`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    const searchData = await searchResponse.json();
    const matchingDocs = searchData.files || [];
    if (matchingDocs.length === 0) {
      console.log('No documents found containing phone number');
      return [];
    }
    // Extract unique parent folder IDs from matching documents
    const parentFolderIds = new Set();
    matchingDocs.forEach((doc)=>{
      if (doc.parents && doc.parents.length > 0) {
        // Get the first parent (immediate parent folder)
        parentFolderIds.add(doc.parents[0]);
      }
    });
    // Fetch folder names for all unique parent IDs in a single batch
    const folderPromises = Array.from(parentFolderIds).map(async (folderId)=>{
      try {
        const folderResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}?fields=name`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        const folderData = await folderResponse.json();
        return folderData.name;
      } catch (error) {
        console.error(`Error fetching folder name for ID ${folderId}:`, error);
        return null;
      }
    });
    const folderNames = await Promise.all(folderPromises);
    const validFolderNames = folderNames.filter((name)=>name !== null);
    console.log('Matching folders found:', validFolderNames);
    return validFolderNames;
  } catch (error) {
    console.error('Error in optimized phone number search:', error);
    // Fallback to empty array instead of throwing
    return [];
  }
}
async function getLatestPrescriptionData(accessToken, folderName) {
  console.log('Getting latest prescription data from folder:', folderName);
  const folderId = await getFolderIdByName(accessToken, folderName);
  const docsResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType='application/vnd.google-apps.document'&orderBy=modifiedTime+desc&pageSize=1&fields=files(id,name)`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  const docsData = await docsResponse.json();
  const latestDoc = docsData.files?.[0];
  if (!latestDoc) {
    throw new Error(`No documents found in folder ${folderName}`);
  }
  const contentResponse = await fetch(`https://docs.googleapis.com/v1/documents/${latestDoc.id}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  const contentData = await contentResponse.json();
  const documentText = extractTextFromDocument(contentData);
  const patientData = parsePatientData(documentText);
  return {
    folderId,
    patientData
  };
}
async function getFolderIdByName(accessToken, folderName) {
  const foldersResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.folder'+and+name='${folderName}'&fields=files(id)&pageSize=1`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  const foldersData = await foldersResponse.json();
  const folder = foldersData.files?.[0];
  if (!folder) {
    throw new Error(`Folder ${folderName} not found`);
  }
  return folder.id;
}
function extractTextFromDocument(document) {
  let text = '';
  if (document.body && document.body.content) {
    for (const element of document.body.content){
      if (element.paragraph) {
        // Handle paragraphs (your existing code)
        for (const textElement of element.paragraph.elements || []){
          if (textElement.textRun) {
            text += textElement.textRun.content;
          }
        }
      } else if (element.table) {
        // Handle tables
        text += extractTextFromTable(element.table);
      }
    }
  }
  return text;
}
function extractTextFromTable(table) {
  let tableText = '';
  if (table.tableRows) {
    for (const row of table.tableRows){
      let rowText = '';
      if (row.tableCells) {
        for (const cell of row.tableCells){
          let cellText = '';
          // Extract text from cell content
          if (cell.content) {
            for (const cellElement of cell.content){
              if (cellElement.paragraph) {
                for (const textElement of cellElement.paragraph.elements || []){
                  if (textElement.textRun) {
                    cellText += textElement.textRun.content;
                  }
                }
              }
            }
          }
          // Add cell separator (tab or pipe)
          rowText += cellText + '\t';
        }
      }
      // Add row separator (newline) and trim trailing tab
      tableText += rowText.replace(/\t$/, '') + '\n';
    }
  }
  return tableText;
}
function parsePatientData(documentText) {
  //console.log('Parsing document text:', documentText);
  const data = {};
  
  const nameMatch = documentText.match(/Name:\s*(?:{{name}}|([^\s\n\r{]+(?:\s+[^\s\n\r{]+)*?))\s*(?:D\.O\.B)/i);
  if (nameMatch && nameMatch[1] && !nameMatch[1].includes('{{')) {
    data.name = nameMatch[1].trim();
  }
  // DOB patterns
  const dobMatch = documentText.match(/(?:D\.O\.B)[:\s]*(?:{{dob}}|([^\s\n\r{]+(?:\s+[^\s\n\r{]+)*?))\s*(?:Phone|Sex|Age)/i);
  if (dobMatch && dobMatch[1] && !dobMatch[1].includes('{{')) {
    data.dob = dobMatch[1].trim();
  }
  // Phone patterns
  const phoneMatch = documentText.match(/Phone[:\s]*(?:{{phone}}|([^\s\n\r{]+))\s*(?:Sex|Age|ID)/i);
  if (phoneMatch && phoneMatch[1] && !phoneMatch[1].includes('{{')) {
    data.phone = phoneMatch[1].trim();
  }
  // Sex patterns
  const sexMatch = documentText.match(/Sex[:\s]*(?:{{sex}}|([^\s\n\r{]+))\s*(?:Age|ID|Date|\n)/i);
  if (sexMatch && sexMatch[1] && !sexMatch[1].includes('{{')) {
    data.sex = sexMatch[1].trim();
  }
  // id patterns
  const idMatch = documentText.match(/ID No: *(?:{{id}}|([^\s\n\r{]+))(?:\n)/);
  if (idMatch && idMatch[1] && !idMatch[1].includes('{{')) {
    data.id = idMatch[1].trim();
  }
  // Medical information - more flexible patterns
  const complaintsMatch = documentText.match(/Complaints[:\s]*(?:{{complaints}}|([^\n\r{}]+(?:\n[^\n\r{}]*)*?))\s*(?:→|Findings|Clinical|$)/i);
  if (complaintsMatch && complaintsMatch[1] && !complaintsMatch[1].includes('{{')) {
    data.complaints = complaintsMatch[1].trim();
  }
  const findingsMatch = documentText.match(/Findings[:\s]*(?:{{findings}}|([^\n\r{}]+(?:\n[^\n\r{}]*)*?))\s*(?:→|Investigations|Diagnosis|$)/i);
  if (findingsMatch && findingsMatch[1] && !findingsMatch[1].includes('{{')) {
    data.findings = findingsMatch[1].trim();
  }
  const investigationsMatch = documentText.match(/Investigations[:\s]*(?:{{investigations}}|([^\n\r{}]+(?:\n[^\n\r{}]*)*?))\s*(?:→|Diagnosis|Advice|$)/i);
  if (investigationsMatch && investigationsMatch[1] && !investigationsMatch[1].includes('{{')) {
    data.investigations = investigationsMatch[1].trim();
  }
  const diagnosisMatch = documentText.match(/Diagnosis[:\s]*(?:{{diagnosis}}|([^\n\r{}]+(?:\n[^\n\r{}]*)*?))\s*(?:→|Advice|Medication|$)/i);
  if (diagnosisMatch && diagnosisMatch[1] && !diagnosisMatch[1].includes('{{')) {
    data.diagnosis = diagnosisMatch[1].trim();
  }
  const adviceMatch = documentText.match(/Advice[:\s]*(?:{{advice}}|([^\n\r{}]+(?:\n[^\n\r{}]*)*?))\s*(?:→|Medication|Get free|Followup|$)/i);
  if (adviceMatch && adviceMatch[1] && !adviceMatch[1].includes('{{')) {
    data.advice = adviceMatch[1].trim();
  }
  // Parse medications from tab-delimited table format (robust parser)
  try {
    const medications = [] as Array<{
      name: string;
      dose: string;
      freqMorning: boolean;
      freqNoon: boolean;
      freqNight: boolean;
      duration: string;
      instructions: string;
    }>;
    const medicationTableMatch = documentText.match(/Medication:(.*?)(?:→|Get free|Followup|Dear)/s);
    if (medicationTableMatch && medicationTableMatch[1]) {
      const tableContent = medicationTableMatch[1];
      const lines = tableContent.split('\n');

      const isTruthyMarker = (val: string | undefined) => {
        if (!val) return false;
        const v = val.trim().toLowerCase();
        return v === '✔' || v === '✓' || v === 'true' || v === '1' || v === 'yes' || v === 'y';
      };

      for (const rawLine of lines) {
        if (!rawLine || rawLine.includes('{{')) continue; // skip template markers
        // Expect tab-delimited columns
        const cols = rawLine.split('\t').map(c => c.trim());
        if (cols.length < 3) continue;
        // First column should be a number (row index)
        if (!/^\d+$/.test(cols[0])) continue;

        const name = cols[1] || '';
        const dose = cols[2] || '';
        const morningMark = cols[3];
        const noonMark = cols[4];
        const nightMark = cols[5];
        const duration = cols[6] || '';
        const instructions = cols[7] || '';

        if (name && name.length > 1) {
          medications.push({
            name,
            dose,
            freqMorning: isTruthyMarker(morningMark),
            freqNoon: isTruthyMarker(noonMark),
            freqNight: isTruthyMarker(nightMark),
            duration,
            instructions,
          });
        }
      }
    }
    if (medications.length > 0) {
      data.medications = medications;
    }
  } catch (error) {
    console.error('Error parsing medications:', error);
  }
  //console.log('Parsed data:', data);
  return data;
}
