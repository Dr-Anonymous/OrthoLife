import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getGoogleAccessToken } from "../_shared/google-auth.ts";

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
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const contentType = req.headers.get("content-type") || "";

        // Check if it's multipart form data
        if (!contentType.includes("multipart/form-data")) {
            throw new Error("Expected multipart/form-data");
        }

        const formData = await req.formData();

        const content = formData.get('content') as string;
        const platformsStr = formData.get('platforms') as string;
        const scheduledAt = formData.get('scheduledAt') as string | null;

        const mediaFiles: File[] = [];
        for (const [key, value] of formData.entries()) {
            if (key === 'files' && value instanceof File) {
                mediaFiles.push(value);
            }
        }

        if (!content && mediaFiles.length === 0) {
            throw new Error("Content or media is required");
        }

        let platforms: SocialPlatform[] = [];
        try {
            platforms = JSON.parse(platformsStr || '[]');
        } catch {
            throw new Error("Invalid platforms array");
        }

        if (!platforms || platforms.length === 0) {
            throw new Error("At least one platform is required");
        }

        console.log(`Publishing post...`);
        console.log(`Content: ${content}`);
        console.log(`Platforms: ${platforms.join(', ')}`);
        console.log(`Scheduled: ${scheduledAt || 'Now'}`);
        console.log(`Media Files: ${mediaFiles.length}`);

        const results: PublishResult[] = [];

        // Mock functionality for publishing to each platform
        for (const platform of platforms) {
            try {
                // Here you would integrate with the actual APIs using Deno.env.get('API_KEY')
                // For example:
                // if (platform === 'twitter') { await publishToTwitter(content, mediaFiles); }

                console.log(`Mocking publish to ${platform}...`);

                if (platform === 'gbp') {
                    const accessToken = await getGoogleAccessToken();
                    if (!accessToken) {
                        throw new Error("Failed to retrieve Google Access Token for GBP");
                    }
                    console.log("Successfully obtained access token for GBP");
                }

                // Simulating artificial delay
                await new Promise(resolve => setTimeout(resolve, 500));

                results.push({
                    platform,
                    success: true,
                    message: `Successfully published${scheduledAt ? ' (scheduled)' : ''} to ${platform}`
                });

            } catch (err: any) {
                console.error(`Error publishing to ${platform}:`, err);
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
        console.error("Error in social-publish function:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
