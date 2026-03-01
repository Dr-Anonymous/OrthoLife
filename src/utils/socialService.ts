/**
 * Social Media Service for OrthoLife
 * Handles direct frontend posting to Google, Facebook, Instagram, and Twitter.
 */

interface PostPayload {
    content: string;
    mediaUrls?: string[];
    scheduledDate?: Date;
    platforms: string[];
}

export const socialService = {
    /**
     * Post to Facebook Page
     * Uses Facebook Graph API
     */
    async postToFacebook(content: PostPayload) {
        const pageAccessToken = import.meta.env.VITE_FACEBOOK_PAGE_ACCESS_TOKEN;
        const pageId = import.meta.env.VITE_FACEBOOK_PAGE_ID;

        if (!pageAccessToken || !pageId) {
            throw new Error('Facebook credentials are missing in .env');
        }

        const url = `https://graph.facebook.com/v19.0/${pageId}/feed`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: content.content,
                access_token: pageAccessToken,
                published: !content.scheduledDate,
                scheduled_publish_time: content.scheduledDate ? Math.floor(content.scheduledDate.getTime() / 1000) : undefined,
            }),
        });

        return response.json();
    },

    /**
     * Post to Instagram
     * Uses Facebook Graph API (IG Content Publishing API)
     */
    async postToInstagram(content: PostPayload) {
        const accessToken = import.meta.env.VITE_FACEBOOK_PAGE_ACCESS_TOKEN;
        const igUserId = import.meta.env.VITE_INSTAGRAM_USER_ID;

        if (!accessToken || !igUserId) {
            throw new Error('Instagram credentials are missing in .env');
        }

        // Step 1: Create media container
        // Note: Instagram requires a public URL for the image media_url
        const containerUrl = `https://graph.facebook.com/v19.0/${igUserId}/media`;
        const containerRes = await fetch(containerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image_url: content.mediaUrls?.[0] || 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d', // Fallback for testing
                caption: content.content,
                access_token: accessToken,
            }),
        });

        const containerData = await containerRes.json();
        if (!containerData.id) throw new Error(containerData.error?.message || 'Failed to create Instagram container');

        // Step 2: Publish media container
        const publishUrl = `https://graph.facebook.com/v19.0/${igUserId}/media_publish`;
        const publishRes = await fetch(publishUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                creation_id: containerData.id,
                access_token: accessToken,
            }),
        });

        return publishRes.json();
    },

    /**
     * Post to Twitter (X)
     * Uses Twitter API v2
     */
    async postToTwitter(content: PostPayload) {
        // Note: Direct frontend calls to Twitter are heavily blocked by CORS.
        // In production, this ALWAYS must go through a proxy (Edge Function).
        // For now, this template shows how a direct post request would look.
        const bearerToken = import.meta.env.VITE_TWITTER_BEARER_TOKEN;

        if (!bearerToken) {
            throw new Error('Twitter credentials (Bearer Token) missing in .env');
        }

        const response = await fetch('https://api.twitter.com/2/tweets', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${bearerToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: content.content,
            }),
        });

        return response.json();
    },

    /**
     * Post to Google Business Profile
     * Uses Google My Business API
     */
    async postToGoogleBusiness(content: PostPayload) {
        const accessToken = import.meta.env.VITE_GOOGLE_ACCESS_TOKEN;
        const accountId = import.meta.env.VITE_GOOGLE_BUSINESS_ACCOUNT_ID;
        const locationId = import.meta.env.VITE_GOOGLE_BUSINESS_LOCATION_ID;

        if (!accessToken || !accountId || !locationId) {
            throw new Error('Google Business Profile credentials missing in .env');
        }

        const url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/localPosts`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                languageCode: 'en-US',
                summary: content.content,
                topicType: 'STANDARD',
            }),
        });

        return response.json();
    },

    /**
     * Orchestrate posts to all selected platforms
     */
    async publishAll(payload: PostPayload) {
        const results: Record<string, any> = {};
        const errors: string[] = [];

        const tasks = payload.platforms.map(async (platform) => {
            try {
                if (platform === 'facebook') results.facebook = await this.postToFacebook(payload);
                if (platform === 'instagram') results.instagram = await this.postToInstagram(payload);
                if (platform === 'twitter') results.twitter = await this.postToTwitter(payload);
                if (platform === 'gbp') results.gbp = await this.postToGoogleBusiness(payload);
            } catch (err: any) {
                errors.push(`${platform}: ${err.message}`);
            }
        });

        await Promise.all(tasks);

        if (errors.length > 0) {
            throw new Error(`Errors occurred while posting: \n${errors.join('\n')}`);
        }

        return results;
    }
};
