import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getGoogleAccessToken } from "../_shared/google-auth.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const { phoneNumber } = await req.json();
    if (!phoneNumber) {
      return new Response(JSON.stringify({
        error: 'Phone number is required'
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
    const patients = await searchPhoneNumber(accessToken, phoneNumber);
    return new Response(JSON.stringify(patients), {
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
      return [];
    }
    const parentFolderIds = new Set();
    matchingDocs.forEach((doc)=>{
      if (doc.parents && doc.parents.length > 0) {
        parentFolderIds.add(doc.parents[0]);
      }
    });
    const patientDataPromises = Array.from(parentFolderIds).map(async (folderId)=>{
      try {
        const { patientData } = await getLatestPrescriptionData(accessToken, folderId);
        if (!patientData || !patientData.name) {
          return null;
        }
        return {
          id: Math.floor(Math.random() * 1000000),
          name: patientData.name,
          dob: patientData.dob,
          sex: patientData.sex,
          phone: patientData.phone || phoneNumber.replace(/\D/g, '').slice(-10),
          drive_id: folderId
        };
      } catch (error) {
        console.error(`Error processing folder ID ${folderId}:`, error);
        return null;
      }
    });
    const patientObjects = await Promise.all(patientDataPromises);
    const validPatients = patientObjects.filter((patient)=>patient !== null);
    return validPatients;
  } catch (error) {
    console.error('Error in phone number search:', error);
    return [];
  }
}
async function getLatestPrescriptionData(accessToken, folderNameOrId) {
  let folderId;
  if (folderNameOrId && folderNameOrId.length > 20 && !folderNameOrId.includes(' ')) {
    folderId = folderNameOrId;
  } else {
    folderId = await getFolderIdByName(accessToken, folderNameOrId);
  }
  if (!folderId) {
    console.warn(`Could not find folder ID for: ${folderNameOrId}`);
    return {
      folderId: null,
      patientData: null
    };
  }
  const docsResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType='application/vnd.google-apps.document'&orderBy=modifiedTime+desc&pageSize=1&fields=files(id,name)`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  const docsData = await docsResponse.json();
  const latestDoc = docsData.files?.[0];
  if (!latestDoc) {
    return {
      folderId,
      patientData: null
    };
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
  const foldersResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.folder'+and+name='${encodeURIComponent(folderName.replace(/'/g, "\\'"))}'&fields=files(id)&pageSize=1`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  const foldersData = await foldersResponse.json();
  const folder = foldersData.files?.[0];
  if (!folder) {
    return null;
  }
  return folder.id;
}
function extractTextFromDocument(document) {
  let text = '';
  if (document.body && document.body.content) {
    for (const element of document.body.content){
      if (element.paragraph) {
        for (const textElement of element.paragraph.elements || []){
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
function extractTextFromTable(table) {
  let tableText = '';
  if (table.tableRows) {
    for (const row of table.tableRows){
      const cellTexts = [];
      if (row.tableCells) {
        for (let cellIndex = 0; cellIndex < row.tableCells.length; cellIndex++){
          const cell = row.tableCells[cellIndex];
          let cellText = '';
          if (cell && cell.content) {
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
          cellText = cellText.replace(/\n/g, ' ').trim();
          cellTexts.push(cellText);
        }
      }
      tableText += cellTexts.join('\t') + '\n';
    }
  }
  return tableText;
}
function parsePatientData(documentText) {
  const data = {};
  const nameMatch = documentText.match(/Name:\s*(?:{{name}}|([^\s\n\r{]+(?:\s+[^\s\n\r{]+)*?))\s*(?:D\.O\.B)/i);
  if (nameMatch && nameMatch[1] && !nameMatch[1].includes('{{')) {
    data.name = nameMatch[1].trim();
  }
  const dobMatch = documentText.match(/(?:D\.O\.B)[:\s]*(?:{{dob}}|([^\s\n\r{]+(?:\s+[^\s\n\r{]+)*?))\s*(?:Phone|Sex|Age)/i);
  if (dobMatch && dobMatch[1] && !dobMatch[1].includes('{{')) {
    data.dob = dobMatch[1].trim();
  }
  const phoneMatch = documentText.match(/Phone[:\s]*(?:{{phone}}|([^\s\n\r{]+))\s*(?:Sex|Age|ID)/i);
  if (phoneMatch && phoneMatch[1] && !phoneMatch[1].includes('{{')) {
    data.phone = phoneMatch[1].trim();
  }
  const sexMatch = documentText.match(/Sex[:\s]*(?:{{sex}}|([^\s\n\r{]+))\s*(?:Age|ID|Date|\n)/i);
  if (sexMatch && sexMatch[1] && !sexMatch[1].includes('{{')) {
    data.sex = sexMatch[1].trim();
  }
  const idMatch = documentText.match(/ID No: *(?:{{id}}|([^\s\n\r{]+))(?:\n)/);
  if (idMatch && idMatch[1] && !idMatch[1].includes('{{')) {
    data.id = idMatch[1].trim();
  }
  const complaintsMatch = documentText.match(/Complaints[:\s]*(?:{{complaints}}|([^→\n\r{}]+(?:\n[^→\n\r{}]*)*?))\s*(?:→|Findings|Clinical|$)/i);
  if (complaintsMatch && complaintsMatch[1] && !complaintsMatch[1].includes('{{')) {
    data.complaints = complaintsMatch[1].trim();
  }
  const findingsMatch = documentText.match(/Findings[:\s]*(?:{{findings}}|([^→\n\r{}]+(?:\n[^→\n\r{}]*)*?))\s*(?:→|Investigations|Diagnosis|$)/i);
  if (findingsMatch && findingsMatch[1] && !findingsMatch[1].includes('{{')) {
    data.findings = findingsMatch[1].trim();
  }
  const investigationsMatch = documentText.match(/Investigations[:\s]*(?:{{investigations}}|([\s\S]*?))(?=\s*(?:→|Diagnosis:|Advice:|[A-Z][A-Za-z\s]+:|$))/i);
  if (investigationsMatch && investigationsMatch[1] && !investigationsMatch[1].includes('{{')) {
    data.investigations = investigationsMatch[1].trim();
  }
  const diagnosisMatch = documentText.match(/Diagnosis[:\s]*(?:{{diagnosis}}|([^→\n\r{}]+(?:\n[^→\n\r{}]*)*?))\s*(?:→|Advice|Medication|$)/i);
  if (diagnosisMatch && diagnosisMatch[1] && !diagnosisMatch[1].includes('{{')) {
    data.diagnosis = diagnosisMatch[1].trim();
  }
  const adviceMatch = documentText.match(/Advice[:\s]*(?:{{advice}}|([^→\n\r{}]+(?:\n[^→\n\r{}]*)*?))\s*(?:→|Medication|Get free|Followup|$)/i);
  if (adviceMatch && adviceMatch[1] && !adviceMatch[1].includes('{{')) {
    data.advice = adviceMatch[1].trim();
  }
  const followupMatch = documentText.match(/Followup[:\s]*(?:{{followup}}|([^→\n\r{}]+(?:\n[^→\n\r{}]*)*?))\s*(?:→|Dear|Orthopaedic|$)/i);
  if (followupMatch && followupMatch[1] && !followupMatch[1].includes('{{')) {
    data.followup = followupMatch[1].trim();
  }
  try {
    const medications = [];
    const medicationTableMatch = documentText.match(/Medication:(.*?)(?:→|Get free|Followup)/s);
    if (medicationTableMatch && medicationTableMatch[1]) {
      const tableContent = medicationTableMatch[1];
      const lines = tableContent.split('\n').map((line)=>line.trim()).filter((line)=>line.length > 0);
      const isTruthyMarker = (val)=>{
        if (!val) return false;
        const v = val.trim().toLowerCase();
        return v === '✔' || v === '✓' || v === 'true' || v === '1' || v === 'yes' || v === 'y' || v.includes('✔');
      };
      for (let i = 0; i < lines.length; i++){
        const line = lines[i];
        if (line.includes('Name') && line.includes('Dose') || line.includes('Morning') || line.includes('ఉదయం') || line.includes('Frequency')) {
          continue;
        }
        let cols;
        if (line.includes('\t')) {
          cols = line.split('\t').map((c)=>c.trim());
        } else {
          cols = line.split(/\s{2,}/).map((c)=>c.trim()).filter((c)=>c.length > 0);
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
          instructions: instructions
        });
      }
    }
    if (medications.length > 0) {
      data.medications = medications;
    } else {
      console.log('No medications found in document');
    }
  } catch (error) {
    console.error('Error parsing medications:', error);
  }
  return data;
}
