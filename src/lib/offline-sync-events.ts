/**
 * Lightweight sync trigger module.
 * Allows components to request an immediate synchronization pass
 * from the useOfflineSync hook via browser events.
 */

export const SYNC_NOW_EVENT = 'ortholife-sync-now';

export const requestOfflineSyncNow = () => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(SYNC_NOW_EVENT));
    }
};
