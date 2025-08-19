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
    const [patientFolders, calendarEvents] = await Promise.all([
      searchPhoneNumber(accessToken, phoneNumber),
      searchCalendarEvents(accessToken, phoneNumber)
    ]);
    const responseBody = {
      patientFolders,
      calendarEvents
    };
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in search whatsappme records:', error);
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
    const folderPromises = Array.from(parentFolderIds).map(async (folderId)=>{
      try {
        const folderResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}?fields=name`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        const folderData = await folderResponse.json();
        return {
          id: folderId,
          name: folderData.name
        };
      } catch (error) {
        console.error(`Error fetching folder name for ID ${folderId}:`, error);
        return null;
      }
    });
    const folderObjects = await Promise.all(folderPromises);
    return folderObjects.filter((folder)=>folder !== null && folder.name);
  } catch (error) {
    console.error('Error in phone number search:', error);
    return [];
  }
}
async function searchCalendarEvents(accessToken, phoneNumber) {
  try {
    const calendarId = Deno.env.get('GOOGLE_CALENDAR_ID');
    const now = new Date().toISOString();
    const searchResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?q=${encodeURIComponent(phoneNumber)}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    if (!searchResponse.ok) {
      const errorData = await searchResponse.json();
      console.error('Google Calendar API error:', errorData);
      return [];
    }
    const searchData = await searchResponse.json();
    const matchingEvents = searchData.items || [];
    return matchingEvents.map((event)=>({
        summary: event.summary,
        start: event.start?.dateTime || event.start?.date,
        description: event.description,
        attachments: event.attachments?.[0]?.fileUrl
      }));
  } catch (error) {
    console.error('Error in calendar event search:', error);
    return [];
  }
}
