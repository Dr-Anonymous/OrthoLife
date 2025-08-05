import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SearchResult {
  patientFolders: string[];
  patientData?: any;
}

serve(async (req) => {
  console.log('Search patient records function called')

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { phoneNumber, selectedFolder } = await req.json()
    console.log('Request data:', { phoneNumber, selectedFolder })

    if (!phoneNumber && !selectedFolder) {
      return new Response(
        JSON.stringify({ error: 'Phone number or selected folder is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY')
    if (!serviceAccountKey) {
      throw new Error('Google Service Account Key not found')
    }

    const credentials = JSON.parse(serviceAccountKey)
    const folderId = '118VD2L8j0lPn7iKE4hqXzXsyGuqRjacH'

    // Get access token
    const accessToken = await getAccessToken(credentials)
    
    let result: SearchResult = { patientFolders: [] }

    if (phoneNumber && !selectedFolder) {
      // Search for phone number and return folder names
      result.patientFolders = await searchPhoneNumber(accessToken, folderId, phoneNumber)
    } else if (selectedFolder) {
      // Get latest prescription data from selected folder
      result.patientData = await getLatestPrescriptionData(accessToken, folderId, selectedFolder)
    }

    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in search patient records:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function getAccessToken(credentials: any): Promise<string> {
  const jwt = await createJWT(credentials)
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  const data = await response.json()
  return data.access_token
}

async function createJWT(credentials: any): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  }

  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }

  const encodedHeader = btoa(JSON.stringify(header)).replace(/[+/=]/g, (match) => {
    switch (match) {
      case '+': return '-'
      case '/': return '_'
      case '=': return ''
      default: return match
    }
  })

  const encodedPayload = btoa(JSON.stringify(payload)).replace(/[+/=]/g, (match) => {
    switch (match) {
      case '+': return '-'
      case '/': return '_'
      case '=': return ''
      default: return match
    }
  })

  const unsignedToken = `${encodedHeader}.${encodedPayload}`

  // Import the private key
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    base64ToArrayBuffer(credentials.private_key.replace(/-----BEGIN PRIVATE KEY-----\n|-----END PRIVATE KEY-----\n/g, '').replace(/\n/g, '')),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  )

  // Sign the token
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(unsignedToken)
  )

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/[+/=]/g, (match) => {
    switch (match) {
      case '+': return '-'
      case '/': return '_'
      case '=': return ''
      default: return match
    }
  })

  return `${unsignedToken}.${encodedSignature}`
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

async function searchPhoneNumber(accessToken: string, folderId: string, phoneNumber: string): Promise<string[]> {
  console.log('Searching for phone number:', phoneNumber)
  
  // Get all folders in the parent folder
  const foldersResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType='application/vnd.google-apps.folder'&fields=files(id,name)`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  )

  const foldersData = await foldersResponse.json()
  const folders = foldersData.files || []
  
  const matchingFolders: string[] = []

  // Search each folder for documents containing the phone number
  for (const folder of folders) {
    const docsResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${folder.id}'+in+parents+and+mimeType='application/vnd.google-apps.document'&fields=files(id,name)`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    )

    const docsData = await docsResponse.json()
    const docs = docsData.files || []

    // Search content of each document for phone number
    for (const doc of docs) {
      try {
        const contentResponse = await fetch(
          `https://docs.googleapis.com/v1/documents/${doc.id}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        )

        const contentData = await contentResponse.json()
        const documentText = extractTextFromDocument(contentData)
        
        if (documentText.includes(phoneNumber)) {
          if (!matchingFolders.includes(folder.name)) {
            matchingFolders.push(folder.name)
          }
          break // Found in this folder, no need to check more docs
        }
      } catch (error) {
        console.error(`Error reading document ${doc.name}:`, error)
      }
    }
  }

  console.log('Matching folders:', matchingFolders)
  return matchingFolders
}

async function getLatestPrescriptionData(accessToken: string, folderId: string, folderName: string): Promise<any> {
  console.log('Getting latest prescription data from folder:', folderName)
  
  // Find the folder by name
  const foldersResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType='application/vnd.google-apps.folder'+and+name='${folderName}'&fields=files(id,name)`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  )

  const foldersData = await foldersResponse.json()
  const folder = foldersData.files?.[0]
  
  if (!folder) {
    throw new Error(`Folder ${folderName} not found`)
  }

  // Get all documents in the folder, sorted by modified time (newest first)
  const docsResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q='${folder.id}'+in+parents+and+mimeType='application/vnd.google-apps.document'&orderBy=modifiedTime+desc&fields=files(id,name,modifiedTime)`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  )

  const docsData = await docsResponse.json()
  const docs = docsData.files || []

  if (docs.length === 0) {
    throw new Error(`No documents found in folder ${folderName}`)
  }

  // Get the latest document
  const latestDoc = docs[0]
  
  const contentResponse = await fetch(
    `https://docs.googleapis.com/v1/documents/${latestDoc.id}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  )

  const contentData = await contentResponse.json()
  const documentText = extractTextFromDocument(contentData)
  
  // Parse the document content to extract patient data
  return parsePatientData(documentText)
}

function extractTextFromDocument(document: any): string {
  let text = ''
  
  if (document.body && document.body.content) {
    for (const element of document.body.content) {
      if (element.paragraph) {
        for (const textElement of element.paragraph.elements || []) {
          if (textElement.textRun) {
            text += textElement.textRun.content
          }
        }
      }
    }
  }
  
  return text
}

function parsePatientData(documentText: string): any {
  console.log('Parsing document text:', documentText.substring(0, 200) + '...')
  
  // This is a basic parser - you may need to adjust based on your document format
  const data: any = {}
  
  // Extract basic patient info using regex patterns
  const nameMatch = documentText.match(/Name[:\s]*([^\n\r]+)/i)
  if (nameMatch) data.name = nameMatch[1].trim()
  
  const dobMatch = documentText.match(/Date of Birth[:\s]*([^\n\r]+)/i) || 
                   documentText.match(/DOB[:\s]*([^\n\r]+)/i)
  if (dobMatch) data.dob = dobMatch[1].trim()
  
  const sexMatch = documentText.match(/Sex[:\s]*([^\n\r]+)/i) ||
                   documentText.match(/Gender[:\s]*([^\n\r]+)/i)
  if (sexMatch) data.sex = sexMatch[1].trim()
  
  const phoneMatch = documentText.match(/Phone[:\s]*([^\n\r]+)/i) ||
                     documentText.match(/Mobile[:\s]*([^\n\r]+)/i)
  if (phoneMatch) data.phone = phoneMatch[1].trim()
  
  const complaintsMatch = documentText.match(/Complaints[:\s]*([^\n\r]+)/i)
  if (complaintsMatch) data.complaints = complaintsMatch[1].trim()
  
  const findingsMatch = documentText.match(/Findings[:\s]*([^\n\r]+)/i)
  if (findingsMatch) data.findings = findingsMatch[1].trim()
  
  const investigationsMatch = documentText.match(/Investigations[:\s]*([^\n\r]+)/i)
  if (investigationsMatch) data.investigations = investigationsMatch[1].trim()
  
  const diagnosisMatch = documentText.match(/Diagnosis[:\s]*([^\n\r]+)/i)
  if (diagnosisMatch) data.diagnosis = diagnosisMatch[1].trim()
  
  const adviceMatch = documentText.match(/Advice[:\s]*([^\n\r]+)/i)
  if (adviceMatch) data.advice = adviceMatch[1].trim()
  
  console.log('Parsed data:', data)
  return data
}