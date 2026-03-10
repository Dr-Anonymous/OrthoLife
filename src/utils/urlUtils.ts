/**
 * Utility to proxy Supabase URLs through the Cloudflare Worker
 * to bypass ISP blocks.
 */
export const proxySupabaseUrl = (url: string | null | undefined): string => {
    if (!url) return '';

    const SUPABASE_HOSTNAME = 'vqskeanwpnvuyxorymib.supabase.co';
    const PROXY_HOSTNAME = 'supabase.gangrenesoul.workers.dev';

    if (url.includes(SUPABASE_HOSTNAME)) {
        return url.replace(SUPABASE_HOSTNAME, PROXY_HOSTNAME);
    }

    return url;
};
