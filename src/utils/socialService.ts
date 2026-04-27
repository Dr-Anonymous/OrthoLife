import { supabase } from '@/integrations/supabase/client';

export type SocialPlatform = 'gbp' | 'instagram' | 'facebook_personal' | 'phone_bridge_only';

export interface GBPLocation {
    name: string;
    title: string;
}

interface PublishAllPayload {
    content: string;
    mediaFiles?: File[];
    scheduledAt?: string;
    platforms: SocialPlatform[];
    gbpLocationName?: string;
    gbpLocationNames?: string[];
    consultant_id?: string;
    consultant_phone?: string;
}

interface SocialPublishResult {
    platform: SocialPlatform;
    success: boolean;
    message?: string;
    data?: unknown;
}

interface SocialPublishResponse {
    results: SocialPublishResult[];
    mediaUrls?: string[];
}

const ALLOWED_PLATFORMS: SocialPlatform[] = ['gbp', 'instagram', 'facebook_personal', 'phone_bridge_only'];

const isSocialPlatform = (value: string): value is SocialPlatform => {
    return ALLOWED_PLATFORMS.includes(value as SocialPlatform);
};

const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    return 'Unknown error';
};

const toResultsRecord = (results: SocialPublishResult[]) => {
    return results.reduce<Record<SocialPlatform, SocialPublishResult | undefined>>((acc, result) => {
        acc[result.platform] = result;
        return acc;
    }, { gbp: undefined, instagram: undefined, facebook_personal: undefined, phone_bridge_only: undefined });
};

export const socialService = {
    async getGBPLocations(): Promise<GBPLocation[]> {
        const { data, error } = await supabase.functions.invoke<{ locations: GBPLocation[] }>('social-publish', {
            method: 'GET',
        });

        if (error) {
            console.error('Error fetching GBP locations:', error);
            return [];
        }

        return data?.locations || [];
    },

    async publishAll(payload: PublishAllPayload) {
        const normalizedPlatforms = payload.platforms.filter(isSocialPlatform);
        if (normalizedPlatforms.length === 0 && (!payload.mediaFiles || payload.mediaFiles.length === 0)) {
            throw new Error('Please select at least one supported platform or add media.');
        }

        if (payload.scheduledAt) {
            const scheduleDate = new Date(payload.scheduledAt);
            if (Number.isNaN(scheduleDate.getTime()) || scheduleDate <= new Date()) {
                throw new Error('Scheduled time must be a valid future date and time.');
            }
        }

        const formData = new FormData();
        formData.append('content', payload.content);
        formData.append('platforms', JSON.stringify(normalizedPlatforms));
        if (payload.scheduledAt) {
            formData.append('scheduledAt', payload.scheduledAt);
        }
        if (payload.gbpLocationName) {
            formData.append('gbpLocationName', payload.gbpLocationName);
        }
        if (payload.gbpLocationNames && payload.gbpLocationNames.length > 0) {
            formData.append('gbpLocationNames', JSON.stringify(payload.gbpLocationNames));
        }
        if (payload.consultant_id) {
            formData.append('consultant_id', payload.consultant_id);
        }
        if (payload.consultant_phone) {
            formData.append('consultant_phone', payload.consultant_phone);
        }
        payload.mediaFiles?.forEach((file) => formData.append('files', file));

        const { data, error } = await supabase.functions.invoke<SocialPublishResponse>('social-publish', {
            method: 'POST',
            body: formData,
        });

        if (error) {
            throw new Error(error.message || 'Failed to publish social post.');
        }

        if (!data || !Array.isArray(data.results)) {
            throw new Error('Invalid response from social publishing service.');
        }

        const failedResults = data.results.filter((result) => !result.success);
        if (failedResults.length > 0) {
            const errors = failedResults.map(
                (result) => `${result.platform}: ${result.message || 'Failed'}`
            );
            throw new Error(`Errors occurred while posting:\n${errors.join('\n')}`);
        }

        return {
            results: toResultsRecord(data.results),
            mediaUrls: data.mediaUrls || []
        };
    },

    async pushToPhoneBridge(routingKey: string, payload: { platform: string; content: string; mediaUrl?: string }) {
        const FIREBASE_URL = `https://whatsauto-9cf91-default-rtdb.firebaseio.com/${routingKey}.json`;
        
        const response = await fetch(FIREBASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                platform: payload.platform,
                message: payload.content,
                media_url: payload.mediaUrl,
                timestamp: Date.now(),
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to push task to phone bridge.');
        }

        return await response.json();
    },

    getErrorMessage,
};
