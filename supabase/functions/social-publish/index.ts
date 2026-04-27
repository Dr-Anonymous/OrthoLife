import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getGoogleAccessToken } from "../_shared/google-auth.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type SocialPlatform = 'gbp' | 'instagram' | 'phone_bridge_only';

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
                        // Important: GPB v4 API for posts expects accounts/{accId}/locations/{locId}
                        // But Business Information v1 API returns only locations/{locId}
                        const locationsWithAccount = locData.locations.map((loc: any) => ({
                            ...loc,
                            name: `${acc.name}/${loc.name}`
                        }));
                        allLocations.push(...locationsWithAccount);
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

        let content = "";
        let platforms: (SocialPlatform | 'phone_bridge_only')[] = [];
        let gbpLocationName: string | null = null;
        let gbpLocationNamesStr: string | null = null;
        let mediaUrls: string[] = [];
        let scheduledAt: string | null = null;
        let consultant_id: string | null = null;
        let consultant_phone: string | null = null;
        let isJsonRequest = false;
        let skipPlatforms: string[] = [];

        if (contentType.includes("application/json")) {
            const body = await req.json();
            content = body.content || "";
            platforms = body.platforms || [];
            gbpLocationName = body.gbpLocationName || null;
            gbpLocationNamesStr = body.gbpLocationNamesStr || null;
            mediaUrls = body.mediaUrls || [];
            skipPlatforms = body.skipPlatforms || [];
            consultant_id = body.consultant_id || null;
            consultant_phone = body.consultant_phone || null;
            isJsonRequest = true;
        } else if (contentType.includes("multipart/form-data")) {
            const formData = await req.formData();
            content = formData.get('content') as string;
            platforms = JSON.parse((formData.get('platforms') as string) || '[]');
            gbpLocationName = formData.get('gbpLocationName') as string | null;
            gbpLocationNamesStr = formData.get('gbpLocationNames') as string | null;
            scheduledAt = formData.get('scheduledAt') as string | null;
            consultant_id = formData.get('consultant_id') as string | null;
            consultant_phone = formData.get('consultant_phone') as string | null;

            const mediaFiles: File[] = [];
            for (const [key, value] of formData.entries()) {
                if (key === 'files' && value instanceof File) {
                    mediaFiles.push(value);
                }
            }

            if (!content && mediaFiles.length === 0) {
                throw new Error("Content or media is required");
            }

            if (mediaFiles.length > 0) {
                console.log(`[social-publish] Uploading ${mediaFiles.length} files to storage...`);
                for (const file of mediaFiles) {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `social-media/${crypto.randomUUID()}.${fileExt}`;

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
        } else {
            throw new Error("Expected multipart/form-data or application/json");
        }

        console.log(`[social-publish] Publishing to platforms: ${platforms.join(', ')}`);

        if ((!platforms || platforms.length === 0) && mediaUrls.length === 0) {
            throw new Error("At least one platform or media file is required");
        }

        // Handle Scheduling
        if (scheduledAt) {
            const scheduledTime = new Date(scheduledAt);
            if (scheduledTime > new Date()) {
                console.log(`[social-publish] Queuing task for ${scheduledTime.toISOString()}`);
                const { error } = await supabase.from('scheduled_tasks').insert({
                    task_type: 'social_post',
                    scheduled_for: scheduledTime.toISOString(),
                    consultant_id,
                    payload: {
                        content,
                        platforms,
                        gbpLocationName,
                        gbpLocationNamesStr,
                        mediaUrls,
                        consultant_phone
                    }
                });
                
                if (error) throw new Error(`Failed to queue task: ${error.message}`);
                
                return new Response(JSON.stringify({ 
                    results: platforms.map(p => ({ platform: p, success: true, message: 'Scheduled successfully' })), 
                    mediaUrls 
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                });
            }
        }

        const results: PublishResult[] = [];



        for (const platform of platforms) {
            if (skipPlatforms.includes(platform)) {
                console.log(`[social-publish] Skipping platform ${platform} (already succeeded)`);
                results.push({ platform, success: true, message: 'Skipped (already succeeded)' });
                continue;
            }

            try {
                if (platform === 'gbp') {
                    console.log("[social-publish] Processing GBP publish...");
                    const accessToken = await getGoogleAccessToken();
                    if (!accessToken) {
                        throw new Error("Failed to retrieve Google Access Token for GBP");
                    }

                    // 1. Target Locations
                    let targetLocations: string[] = [];
                    if (gbpLocationNamesStr) {
                        try {
                            targetLocations = JSON.parse(gbpLocationNamesStr);
                        } catch (e) {
                            console.error("[social-publish] Failed to parse gbpLocationNames", e);
                        }
                    }

                    if (targetLocations.length === 0) {
                        const singleLocation = gbpLocationName || Deno.env.get('GOOGLE_BUSINESS_LOCATION_NAME');
                        if (singleLocation) {
                            targetLocations.push(singleLocation);
                        }
                    }

                    if (targetLocations.length === 0) {
                        console.log("[social-publish] No locations provided, attempting auto-discovery...");
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
                                    targetLocations.push(`${acc.name}/${match.name}`);
                                    console.log(`[social-publish] Auto-selected location: ${match.title} (${targetLocations[0]})`);
                                    break;
                                }
                            }
                        }
                    }

                    if (targetLocations.length === 0) throw new Error("No GBP location found. Ensure you have a verified business profile.");

                    // 2. Prepare Media for GBP
                    const mediaItems = mediaUrls.map(url => ({
                        mediaFormat: 'PHOTO', // Assuming all uploaded media are photos for now
                        sourceUrl: url
                    }));

                    // 3. Create Posts for all targets
                    const gbpErrors: string[] = [];
                    const gbpSuccesses: any[] = [];

                    for (const targetName of targetLocations) {
                        console.log(`[social-publish] Sending POST to GBP Location: ${targetName}`);
                        try {
                            const postRes = await fetch(`https://mybusiness.googleapis.com/v4/${targetName}/localPosts`, {
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
                                console.error(`[social-publish] GBP Create Post failed for ${targetName}: ${errBody}`);
                                gbpErrors.push(`Failed for ${targetName}: ${postRes.status}`);
                            } else {
                                gbpSuccesses.push(await postRes.json());
                            }
                        } catch (e: any) {
                            console.error(`[social-publish] Exception during GBP POST for ${targetName}`, e);
                            gbpErrors.push(`Exception for ${targetName}: ${e.message}`);
                        }
                    }

                    if (gbpSuccesses.length > 0) {
                        results.push({
                            platform: 'gbp',
                            success: true,
                            message: `Successfully published to ${gbpSuccesses.length} GBP profile(s).${gbpErrors.length > 0 ? ` Errors: ${gbpErrors.join(', ')}` : ''}`,
                            data: gbpSuccesses
                        });
                    } else {
                        throw new Error(`Failed to publish to any GBP profile: ${gbpErrors.join('; ')}`);
                    }

                } else if (platform === 'instagram') {
                    console.log("[social-publish] Processing Instagram publish...");
                    const igUserId = "17841462136125230"; //Deno.env.get('IG_BUSINESS_ACCOUNT_ID');
                    const accessToken = "EAAs6rRo4yBIBRPqIZC2DleexWQwBxtXrlsbTbosGlurv3ZA3uSaAbHK8hmvMMWNwLZCA6N1mljXOo70ZAEhF9ZCIaA393YItOkmvFwUCOSVVPFzc2AAfpxNAw94DLcnRTKkc96yc46BXcl9FAtbIkSsUaw24FETn85nlEVt2nQRyII1I6mWAW1ZBbIM0ZCk9By8ZBcvcAIBpxmjcwbZBUqezCxpMAoKLI6Jph6oco856YRvTpuNud0nd50BiYixoZD"; // Deno.env.get('FB_PAGE_ACCESS_TOKEN'); // IG usually uses the linked Page access token

                    if (!igUserId || !accessToken) {
                        throw new Error("Instagram credentials (IG_BUSINESS_ACCOUNT_ID, FB_PAGE_ACCESS_TOKEN) are missing.");
                    }

                    if (mediaUrls.length === 0) {
                        throw new Error("Instagram requires at least one image or video.");
                    }

                    let creationId;
                    if (mediaUrls.length === 1) {
                        // Single image
                        const containerRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                image_url: mediaUrls[0],
                                caption: content,
                                access_token: accessToken
                            })
                        });
                        if (!containerRes.ok) throw new Error(`IG Container creation failed: ${await containerRes.text()}`);
                        const data = await containerRes.json();
                        creationId = data.id;
                    } else {
                        // Carousel
                        const childrenIds = [];
                        for (const url of mediaUrls) {
                            const res = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    media_type: 'IMAGE', // Assuming all are images for now
                                    image_url: url,
                                    is_carousel_item: true,
                                    access_token: accessToken
                                })
                            });
                            if (res.ok) {
                                const data = await res.json();
                                childrenIds.push(data.id);
                            }
                        }

                        const containerRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                media_type: 'CAROUSEL',
                                children: childrenIds,
                                caption: content,
                                access_token: accessToken
                            })
                        });
                        if (!containerRes.ok) throw new Error(`IG Carousel Container creation failed: ${await containerRes.text()}`);
                        const data = await containerRes.json();
                        creationId = data.id;
                    }

                    // Wait a bit for IG to process the container
                    await new Promise(r => setTimeout(r, 2000));

                    // Publish
                    const publishRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media_publish`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            creation_id: creationId,
                            access_token: accessToken
                        })
                    });

                    if (!publishRes.ok) {
                        const err = await publishRes.text();
                        console.error(`[social-publish] Instagram API Error: ${err}`);
                        throw new Error(`Instagram API Error: ${publishRes.status}`);
                    }

                    results.push({
                        platform: 'instagram',
                        success: true,
                        message: `Successfully published to Instagram Business account.`,
                        data: await publishRes.json()
                    });

                } else if (platform === 'phone_bridge_only') {
                    console.log("[social-publish] Processing phone bridge (Facebook Personal)...");
                    
                    // Use the consultant_phone from payload or look it up
                    let routingKey = consultant_phone;
                    if (!routingKey && consultant_id) {
                        const { data: c } = await supabase.from('consultants').select('phone').eq('id', consultant_id).single();
                        routingKey = c?.phone;
                    }

                    if (!routingKey) {
                        throw new Error("Consultant phone is required for phone bridge posts.");
                    }

                    const FIREBASE_URL = `https://whatsauto-9cf91-default-rtdb.firebaseio.com/${routingKey}.json`;
                    const fbRes = await fetch(FIREBASE_URL, {
                        method: 'POST',
                        body: JSON.stringify({
                            platform: 'facebook',
                            message: content,
                            media_url: mediaUrls[0] || null,
                            timestamp: Date.now(),
                        }),
                    });

                    if (!fbRes.ok) {
                        throw new Error(`Failed to push to phone bridge: ${fbRes.statusText}`);
                    }

                    results.push({
                        platform: 'phone_bridge_only',
                        success: true,
                        message: "Successfully pushed to phone bridge."
                    });
                } else {
                    console.log(`[social-publish] Platform '${platform}' is currently not handled or mocked.`);
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
        /* 
        // Cleanup: DISABLED because the phone bridge needs time to download these files!
        if (mediaUrls.length > 0) {
            console.log(`[social-publish] Cleaning up ${mediaUrls.length} files from storage...`);
            const paths = mediaUrls.map(url => {
                const parts = url.split('/social-media/');
                return parts.length > 1 ? parts[1] : null;
            }).filter(Boolean) as string[];

            if (paths.length > 0) {
                const { error: deleteError } = await supabase.storage
                    .from('social-media')
                    .remove(paths);
                
                if (deleteError) {
                    console.error("[social-publish] Cleanup failed:", deleteError);
                } else {
                    console.log("[social-publish] Storage cleanup successful.");
                }
            }
        }
        */

        if (platforms.includes('phone_bridge_only')) {
            results.push({
                platform: 'phone_bridge_only',
                success: true,
                message: "Media uploaded/handled for phone bridge"
            });
        }

        return new Response(JSON.stringify({ results, mediaUrls }), {
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