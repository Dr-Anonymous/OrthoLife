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
    let templateId = "1WqiyTfWBG4j7I4iry0weMmMLEPGJZDnTNkiZHCdd9Ao", myId = '';
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
      }
    ];
    if (replacements.length > 0) {
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
    }
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
