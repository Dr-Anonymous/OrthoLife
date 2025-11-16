import { getGoogleAccessToken } from "./google-auth.ts";

async function searchFoldersByPhoneNumber(accessToken: string, phoneNumber: string): Promise<Set<string>> {
    const searchQuery = encodeURIComponent(`fullText contains '${phoneNumber}' and mimeType='application/vnd.google-apps.document'`);
    const searchResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=${searchQuery}&fields=files(id,name,parents)`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const searchData = await searchResponse.json();
    const matchingDocs = searchData.files || [];
    if (matchingDocs.length === 0) return new Set();

    const parentFolderIds = new Set<string>();
    matchingDocs.forEach((doc: any) => {
        if (doc.parents && doc.parents.length > 0) parentFolderIds.add(doc.parents[0]);
    });
    return parentFolderIds;
}

export async function searchPhoneNumberInDrive(phoneNumber: string) {
    const accessToken = await getGoogleAccessToken();
    const parentFolderIds = await searchFoldersByPhoneNumber(accessToken, phoneNumber);

    const patientDataPromises = Array.from(parentFolderIds).map(async (folderId) => {
        const { patientData } = await getLatestPrescriptionData(accessToken, folderId);
        if (!patientData || !patientData.name) return null;
        return { ...patientData, id: parseInt(patientData.id, 10), drive_id: folderId };
    });

    const patientObjects = await Promise.all(patientDataPromises);
    return patientObjects.filter(patient => patient !== null);
}

async function getLatestPrescriptionData(accessToken: string, folderId: string) {
    const docsResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType='application/vnd.google-apps.document'&orderBy=modifiedTime+desc&pageSize=1&fields=files(id,name)`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const docsData = await docsResponse.json();
    const latestDoc = docsData.files?.[0];
    if (!latestDoc) return { folderId, patientData: null };

    const contentResponse = await fetch(`https://docs.googleapis.com/v1/documents/${latestDoc.id}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const contentData = await contentResponse.json();
    const documentText = extractTextFromDocument(contentData);
    const patientData = parsePatientData(documentText);
    return { folderId, patientData };
}

function extractTextFromDocument(document: any): string {
    let text = '';
    if (document.body?.content) {
        for (const element of document.body.content) {
            if (element.paragraph) {
                for (const textElement of element.paragraph.elements || []) {
                    if (textElement.textRun) text += textElement.textRun.content;
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
            const cellTexts = [];
            if (row.tableCells) {
                for (const cell of row.tableCells) {
                    let cellText = '';
                    if (cell?.content) {
                        for (const cellElement of cell.content) {
                            if (cellElement.paragraph) {
                                for (const textElement of cellElement.paragraph.elements || []) {
                                    if (textElement.textRun) cellText += textElement.textRun.content;
                                }
                            }
                        }
                    }
                    cellTexts.push(cellText.replace(/\n/g, ' ').trim());
                }
            }
            tableText += cellTexts.join('\t') + '\n';
        }
    }
    return tableText;
}

function parsePatientData(documentText: string): any {
    const data: any = {};
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
    // Simplified medication parsing
    const medications = [];
    const medicationTableMatch = documentText.match(/Medication:(.*?)(?:→|Get free|Followup)/s);
    if (medicationTableMatch && medicationTableMatch[1]) {
        const tableContent = medicationTableMatch[1];
        const lines = tableContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        const isTruthyMarker = (val: string) => val && ['✔', '✓', 'true', '1', 'yes', 'y'].includes(val.trim().toLowerCase());

        for (const line of lines) {
            if (line.match(/Name|Dose|Morning|Frequency/i)) continue;
            const cols = line.split(/\s{2,}|	/).map(c => c.trim());
            if (cols.length < 3 || !/^\d+\.?$/.test(cols[0])) continue;

            medications.push({
                name: cols[1] || '',
                dose: cols[2] || '',
                freqMorning: isTruthyMarker(cols[3]),
                freqNoon: isTruthyMarker(cols[4]),
                freqNight: isTruthyMarker(cols[5]),
                duration: cols[6] || '',
                instructions: cols[7] || '',
            });
        }
    }
    if (medications.length > 0) data.medications = medications;
    return data;
}

export { searchFoldersByPhoneNumber };
