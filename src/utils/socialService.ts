import { supabase } from '@/integrations/supabase/client';

export type SocialPlatform = 'gbp' | 'facebook' | 'instagram' | 'facebook_personal';

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

const ALLOWED_PLATFORMS: SocialPlatform[] = ['gbp', 'facebook', 'instagram', 'facebook_personal'];

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
    }, { gbp: undefined, facebook: undefined, instagram: undefined, facebook_personal: undefined });
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
        if (normalizedPlatforms.length === 0) {
            throw new Error('Please select at least one supported platform.');
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

    getErrorMessage,
};
