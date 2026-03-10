import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getGoogleAccessToken } from "../_shared/google-auth.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type SocialPlatform = 'gbp' | 'facebook' | 'instagram' | 'twitter';

interface PublishResult {
    platform: SocialPlatform;
    success: boolean;
    message?: string;
    data?: any;
}

serve(async (req: Request) => {
    console.log(`[social-publish] Received ${req.method} request to ${req.url}`);

    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle GET: List GBP Locations
    if (req.method === 'GET') {
        try {
            console.log("[social-publish] Fetching Google Business Profile accounts...");
            const accessToken = await getGoogleAccessToken();
            if (!accessToken) throw new Error("Could not obtain Google Access Token.");

            // Check Scopes
            const infoRes = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`);
            const tokenInfo = await infoRes.json();
            console.log("[social-publish] Token Scopes:", tokenInfo.scope);

            // 1. Fetch Accounts
            const accRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (!accRes.ok) {
                const errText = await accRes.text();
                console.error(`[social-publish] Google Accounts API error: ${errText}`);
                throw new Error(`Google API error: ${accRes.status}`);
            }

            const accData = await accRes.json();
            const accounts = accData.accounts || [];
            console.log(`[social-publish] Found ${accounts.length} GBP accounts.`);

            const allLocations = [];
            for (const acc of accounts) {
                console.log(`[social-publish] Fetching locations for account: ${acc.name} (${acc.accountName})`);
                const locRes = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${acc.name}/locations?readMask=name,title`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });

                if (locRes.ok) {
                    const locData = await locRes.json();
                    if (locData.locations) {
                        console.log(`[social-publish] Found ${locData.locations.length} locations in ${acc.name}`);
                        allLocations.push(...locData.locations);
                    } else {
                        console.log(`[social-publish] No locations found in ${acc.name}`);
                    }
                } else {
                    console.warn(`[social-publish] Failed to fetch locations for ${acc.name}: ${await locRes.text()}`);
                }
            }

            console.log(`[social-publish] Total locations discovered: ${allLocations.length}`);
            return new Response(JSON.stringify({ locations: allLocations }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        } catch (error: any) {
            console.error(`[social-publish] GET error: ${error.message}`);
            return new Response(JSON.stringify({ error: error.message }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            });
        }
    }

    // Handle POST: Publish
    try {
        const contentType = req.headers.get("content-type") || "";

        // Check if it's multipart form data
        if (!contentType.includes("multipart/form-data")) {
            throw new Error("Expected multipart/form-data");
        }

        const formData = await req.formData();

        const content = formData.get('content') as string;
        const platformsStr = formData.get('platforms') as string;
        const gbpLocationName = formData.get('gbpLocationName') as string | null;

        const mediaFiles: File[] = [];
        for (const [key, value] of formData.entries()) {
            if (key === 'files' && value instanceof File) {
                mediaFiles.push(value);
            }
        }

        if (!content && mediaFiles.length === 0) {
            throw new Error("Content or media is required");
        }

        let platforms: SocialPlatform[] = JSON.parse(platformsStr || '[]');
        console.log(`[social-publish] Publishing to platforms: ${platforms.join(', ')}`);

        if (!platforms || platforms.length === 0) {
            throw new Error("At least one platform is required");
        }

        const results: PublishResult[] = [];

        // Upload media to Supabase Storage if present
        const mediaUrls: string[] = [];
        if (mediaFiles.length > 0) {
            console.log(`[social-publish] Uploading ${mediaFiles.length} files to storage...`);
            for (const file of mediaFiles) {
                const fileExt = file.name.split('.').pop();
                const fileName = `social-media/${crypto.randomUUID()}.${fileExt}`;

                // Note: Ensure the 'social-media' bucket exists in your Supabase dashboard
                const { data, error } = await supabase.storage
                    .from('social-media')
                    .upload(fileName, file, { contentType: file.type, upsert: true });

                if (error) {
                    console.error("[social-publish] Storage upload failed:", error);
                    continue;
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('social-media')
                    .getPublicUrl(fileName);

                mediaUrls.push(publicUrl);
                console.log(`[social-publish] Media uploaded: ${publicUrl}`);
            }
        }

        for (const platform of platforms) {
            try {
                if (platform === 'gbp') {
                    console.log("[social-publish] Processing GBP publish...");
                    const accessToken = await getGoogleAccessToken();
                    if (!accessToken) {
                        throw new Error("Failed to retrieve Google Access Token for GBP");
                    }

                    // 1. Target Location
                    let targetLocationName = gbpLocationName || Deno.env.get('GOOGLE_BUSINESS_LOCATION_NAME');

                    if (!targetLocationName) {
                        console.log("[social-publish] No location provided, attempting auto-discovery...");
                        const accRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
                            headers: { 'Authorization': `Bearer ${accessToken}` }
                        });
                        if (!accRes.ok) throw new Error(`GBP Account discovery failed: ${await accRes.text()}`);
                        const accData = await accRes.json();
                        const accounts = accData.accounts || [];
                        if (accounts.length === 0) throw new Error("No Google Business accounts found for this user.");

                        for (const acc of accounts) {
                            const locRes = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${acc.name}/locations?readMask=name,title`, {
                                headers: { 'Authorization': `Bearer ${accessToken}` }
                            });
                            if (locRes.ok) {
                                const locData = await locRes.json();
                                if (locData.locations && locData.locations.length > 0) {
                                    // If multiple, maybe we should filter by specific name if we knew it
                                    // For now, we take the first one or the one matching "OrthoLife"
                                    const match = locData.locations.find((l: any) => l.title?.toLowerCase().includes('ortholife')) || locData.locations[0];
                                    targetLocationName = match.name;
                                    console.log(`[social-publish] Auto-selected location: ${match.title} (${targetLocationName})`);
                                    break;
                                }
                            }
                        }
                    }

                    if (!targetLocationName) throw new Error("No GBP location found. Ensure you have a verified business profile.");

                    // 2. Prepare Media for GBP
                    const mediaItems = mediaUrls.map(url => ({
                        mediaFormat: 'PHOTO', // Assuming all uploaded media are photos for now
                        sourceUrl: url
                    }));

                    // 3. Create Post
                    // Endpoint: https://mybusiness.googleapis.com/v4/{parent=accounts/*/locations/*}/localPosts
                    console.log(`[social-publish] Sending POST to GBP Location: ${targetLocationName}`);
                    const postRes = await fetch(`https://mybusiness.googleapis.com/v4/${targetLocationName}/localPosts`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            languageCode: 'en-US',
                            summary: content,
                            topicType: 'STANDARD',
                            media: mediaItems.length > 0 ? mediaItems : undefined
                        })
                    });

                    if (!postRes.ok) {
                        const errBody = await postRes.text();
                        console.error(`[social-publish] GBP Create Post failed: ${errBody}`);
                        throw new Error(`Google API Error: ${postRes.status}`);
                    }

                    results.push({
                        platform: 'gbp',
                        success: true,
                        message: `Successfully published to GBP profile.`,
                        data: await postRes.json()
                    });

                } else {
                    // Other platforms still mocked for now
                    console.log(`[social-publish] Platform '${platform}' is currently mocked.`);
                    results.push({
                        platform,
                        success: true,
                        message: `Published (mocked) to ${platform}`
                    });
                }

            } catch (err: any) {
                console.error(`[social-publish] Error with platform ${platform}:`, err);
                results.push({
                    platform,
                    success: false,
                    message: err.message || `Failed to publish to ${platform}`
                });
            }
        }

        return new Response(JSON.stringify({ results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        console.error(`[social-publish] POST error: ${error.message}`);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
