import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineStore } from '@/lib/local-storage';
import { generateCompletionMessage } from '@/lib/consultation-utils';
import { getMatchingGuides } from '@/lib/guideMatching';
import { Guide } from '@/types/consultation';
import { SYNC_NOW_EVENT } from '@/lib/offline-sync-events';
import { OfflineConsultationBundle } from '@/types/offline-sync';

interface UseOfflineSyncProps {
    isOnline: boolean;
    consultantName?: { en: string; te: string };
    consultantId?: string;
}

type OfflinePatientDetails = {
    id: string;
    name: string;
    dob: string;
    sex: string | null;
    phone: string;
    secondary_phone?: string;
    is_dob_estimated?: boolean;
    occupation?: string;
    blood_group?: string;
    hometown?: string;
};

type OfflineConsultationRecord = Partial<OfflineConsultationBundle> & {
    patientDetails: OfflinePatientDetails;
    extraData?: Record<string, unknown>;
    status?: OfflineConsultationBundle['status'];
    timestamp?: string;
};

export const cachePatients = async (patients: any[]) => {
    const currentCache = (await offlineStore.getItem('patientCache') as any[]) || [];

    // Create a map by ID for faster lookups and merging
    const patientMap = new Map(currentCache.map(p => [p.id, p]));

    patients.forEach(p => {
        patientMap.set(p.id, p);
    });

    // Limit cache size to 500 recent patients to keep it lightweight
    const updatedCache = Array.from(patientMap.values())
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()) // Sort by recency if possible
        .slice(0, 500);

    await offlineStore.setItem('patientCache', updatedCache);
};

export const searchLocalPatients = async (term: string, type: 'name' | 'phone') => {
    const cache = (await offlineStore.getItem('patientCache') as any[]) || [];
    const lowerTerm = term.toLowerCase();

    return cache.filter(p => {
        if (type === 'name') {
            return p.name.toLowerCase().includes(lowerTerm);
        } else {
            return p.phone.includes(term);
        }
    });
};

/**
 * useOfflineSync Hook
 * 
 * Manages the synchronization of data between local IndexedDB (offline storage) and Supabase (server).
 * 
 * Key Responsibilities:
 * 1. Monitors online status.
 * 2. Scans `offlineStore` for pending items (new patients, consultations).
 * 3. Registers new patients first, then links consultations to them.
 * 4. Handles ID re-keying: Swaps temporary offline IDs (e.g., "offline-123") with real server UUIDs.
 * 5. Syncs updates to existing consultations.
 * 6. Detects and manages conflicts (Server timestamp > Local timestamp).
 * 7. Sends completion notifications automatically upon successful sync of completed consultations.
 * 
 * @param isOnline Boolean indicating network status.
 */
export const useOfflineSync = ({ isOnline, consultantName, consultantId }: UseOfflineSyncProps) => {
    const [pendingSyncIds, setPendingSyncIds] = useState<string[]>([]);
    const [conflictData, setConflictData] = useState<{ local: any, server: any, consultationId: string } | null>(null);
    const [patientConflictData, setPatientConflictData] = useState<{ consultationId: string, offlinePatient: any, conflictingPatients: any[] } | null>(null);
    const isSyncingRef = useRef(false);
    const [guides, setGuides] = useState<Guide[]>([]);

    const buildPatientUpdatePayload = (patientDetails: OfflinePatientDetails) => {
        const patientUpdate: Record<string, unknown> = {
            name: patientDetails.name,
            dob: patientDetails.dob,
            sex: patientDetails.sex,
            phone: patientDetails.phone
        };
        if (patientDetails.secondary_phone !== undefined) patientUpdate.secondary_phone = patientDetails.secondary_phone;
        if (patientDetails.is_dob_estimated !== undefined) patientUpdate.is_dob_estimated = patientDetails.is_dob_estimated;
        if (patientDetails.occupation !== undefined) patientUpdate.occupation = patientDetails.occupation;
        if (patientDetails.blood_group !== undefined) patientUpdate.blood_group = patientDetails.blood_group;
        if (patientDetails.hometown !== undefined) patientUpdate.hometown = patientDetails.hometown;
        return patientUpdate;
    };

    const buildConsultationUpdatePayload = (
        bundle: Partial<OfflineConsultationBundle> & { extraData: Record<string, unknown>, status: OfflineConsultationBundle['status'] }
    ) => {
        const consultationUpdate: Record<string, unknown> = {
            consultation_data: bundle.extraData,
            status: bundle.status
        };
        if (bundle.visit_type !== undefined) consultationUpdate.visit_type = bundle.visit_type;
        if (bundle.location !== undefined) consultationUpdate.location = bundle.location;
        if (bundle.language !== undefined) consultationUpdate.language = bundle.language;
        if (bundle.duration !== undefined) consultationUpdate.duration = bundle.duration;
        if (bundle.procedure_fee !== undefined) consultationUpdate.procedure_fee = bundle.procedure_fee;
        if (bundle.procedure_consultant_cut !== undefined) consultationUpdate.procedure_consultant_cut = bundle.procedure_consultant_cut;
        if (bundle.referred_by !== undefined) consultationUpdate.referred_by = bundle.referred_by;
        if (bundle.referral_amount !== undefined) consultationUpdate.referral_amount = bundle.referral_amount;
        if (bundle.next_review_date !== undefined) consultationUpdate.next_review_date = bundle.next_review_date;
        return consultationUpdate;
    };

    // Fetch guides once for notification matching
    useEffect(() => {
        const fetchGuides = async () => {
            const { data, error } = await supabase
                .from('guides')
                .select('id, title, description, categories(name), guide_translations(language, title, description)');

            if (!error && data) {
                setGuides(data as unknown as Guide[]);
            }
        };
        fetchGuides();
    }, []);

    const sendNotification = async (patient: any, consultationData: any, language: string) => {
        const isAutoSendEnabled = JSON.parse(localStorage.getItem('isAutoSendEnabled') || 'true');
        if (!isAutoSendEnabled) return;

        try {
            const advice = consultationData.advice || '';
            const matchedGuides = getMatchingGuides(advice, guides, language);
            const message = generateCompletionMessage(patient, matchedGuides, language, consultantName);

            const { error } = await supabase.functions.invoke('send-whatsapp', {
                body: { 
                    number: patient.phone, 
                    message: message,
                    consultant_id: consultantId
                },
            });
            if (error) throw error;
            console.log('Offline sync notification sent');
        } catch (err) {
            console.error('Failed to send WhatsApp notification during sync:', err);
        }
    };

    useEffect(() => {
        const syncOfflineData = async () => {
            if (!isOnline) return;
            if (conflictData || patientConflictData) return;
            if (isSyncingRef.current) return;

            // console.log("Starting syncOfflineData pass...");
            isSyncingRef.current = true;
            try {
                const keys = await offlineStore.keys();
                if (keys.length > 0) {
                    const pending = keys.filter(k => k !== 'autofill_keywords' && k !== 'patientCache' && !String(k).startsWith('server_cache_'));
                    setPendingSyncIds(pending);

                    for (const key of pending) {
                        try {
                            const offlineData = await offlineStore.getItem(key) as any;
                            if (!offlineData) continue;

                            // Handling offline patients
                            if (String(key).startsWith('offline-') && !String(key).startsWith('offline-consultation-')) {
                                // Check for patient data validity
                                if (!offlineData.patient || !offlineData.patient.phone) {
                                    console.warn("Invalid offline patient data, removing", key);
                                    await offlineStore.removeItem(key);
                                    setPendingSyncIds(prev => prev.filter(id => id !== key));
                                    continue;
                                }

                                // Delegate deduplication to backend to match strict online behavior
                                // The backend function 'register-patient-and-consultation' handles similarity checks
                                const { id: _offlineId, ...patientDataToRegister } = offlineData.patient;

                                // Pass location from offlineData.consultation (fallback to patient data if structure varies)
                                const location = offlineData.consultation?.location || offlineData.location;

                                const { data, error } = await supabase.functions.invoke('register-patient-and-consultation', {
                                    body: { ...patientDataToRegister, location },
                                });
                                if (error) throw error;

                                if (data?.status === 'error') {
                                    console.warn("Backend rejected offline registration:", data.message);
                                    // If backend rejects it (e.g. duplicate), we must discard the offline attempt to prevent crash loop
                                    // Ideally we'd notify user, but for now we just clean up
                                    await offlineStore.removeItem(key);
                                    setPendingSyncIds(prev => prev.filter(id => id !== key));
                                    continue;
                                }

                                const createdConsultationId = data.consultation?.id;
                                const createdPatientId = data.consultation?.patient_id;

                                if (!createdConsultationId) {
                                    throw new Error("Invalid response format from register-patient-and-consultation");
                                }

                                // Update the automatically created consultation with actual local data
                                if (createdConsultationId) {
                                    const consultationPayload = offlineData.consultation || {};
                                    const { error: updateError } = await supabase.from('consultations').update({
                                        consultation_data: consultationPayload.consultation_data || offlineData.consultationData || {},
                                        status: consultationPayload.status || offlineData.status || 'pending',
                                        visit_type: consultationPayload.visit_type || 'paid',
                                        location: location, // Ensure location is updated if backend default differs
                                        next_review_date: consultationPayload.next_review_date || offlineData.next_review_date || null
                                    }).eq('id', createdConsultationId);

                                    if (updateError) throw updateError;
                                }

                                if (createdConsultationId) {
                                    console.log("Sync successful, re-keying dependencies to:", createdConsultationId);

                                    // RE-KEYING STRATEGY:
                                    // Look for any other offline items (consultation edits) that reference this temporary offline ID.
                                    // We need to point them to the REAL patient ID and REAL consultation ID.
                                    // this is for Consultation.tsx adding consultation details to an offline patient. 

                                    const allKeys = await offlineStore.keys();
                                    const tempPatientId = key; // e.g. "offline-123"

                                    for (const otherKey of allKeys) {
                                        if (otherKey === key) continue; // Skip self

                                        const otherItem = await offlineStore.getItem(otherKey) as any;
                                        if (!otherItem) continue;

                                        // Check if this item is linked to our temp patient
                                        const isLinked = otherItem.patientDetails?.id === tempPatientId || otherItem.patient_id === tempPatientId;

                                        if (isLinked) {
                                            console.log("Found linked offline item, re-keying:", otherKey, "to", createdConsultationId);

                                            // Update IDs inside the item
                                            if (otherItem.patientDetails && createdPatientId) otherItem.patientDetails.id = createdPatientId;
                                            // We don't explicitly store patient_id in the item root usually, but if we did:
                                            if (otherItem.patient_id && createdPatientId) otherItem.patient_id = createdPatientId;

                                            // Update timestamp to now so it beats the server's creation time (avoiding conflict modal)
                                            otherItem.timestamp = new Date().toISOString();

                                            // Save under the NEW real UUID
                                            await offlineStore.setItem(createdConsultationId, otherItem);

                                            // Remove the OLD temporary key
                                            await offlineStore.removeItem(otherKey);

                                            // Update pending list to reflect this change (remove old, add new)
                                            setPendingSyncIds(prev => {
                                                const filtered = prev.filter(k => k !== otherKey);
                                                return [...filtered, createdConsultationId];
                                            });
                                        }
                                    }
                                }

                                await offlineStore.removeItem(key);
                                setPendingSyncIds(prev => prev.filter(id => id !== key));
                                continue;
                            }

                            // Handling new consultations for existing patients (offline-consultation- prefix)
                            if (String(key).startsWith('offline-consultation-')) {
                                const { patientDetails, extraData } = offlineData;
                                if (!patientDetails || !patientDetails.id) {
                                    console.warn("Missing patient details for offline consultation, removing", key);
                                    await offlineStore.removeItem(key);
                                    setPendingSyncIds(prev => prev.filter(id => id !== key));
                                    continue;
                                }

                                // Insert as new consultation
                                const { error: consError } = await supabase.from('consultations').insert({
                                    patient_id: patientDetails.id,
                                    consultation_data: extraData || {},
                                    status: 'pending',
                                    visit_type: extraData.visit_type || 'paid',
                                    next_review_date: offlineData.next_review_date || null
                                }).select().single(); // select to ensure we wait? not needed if we trust insert

                                if (consError) throw consError;

                                await offlineStore.removeItem(key);
                                setPendingSyncIds(prev => prev.filter(id => id !== key));
                                continue;
                            }

                            // Existing consultation sync (Standard UUIDs)
                            // Validate UUID format roughly to avoid 400s
                            if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) {
                                // Skip invalid keys that might be stuck
                                continue;
                            }

                            const { data: serverConsultation, error } = await supabase
                                .from('consultations')
                                .select('*, patients(*)')
                                .eq('id', key)
                                .single();

                            if (error) {
                                // PGRST116 means "No rows found" - safe to remove if it's gone from server
                                if (error.code === 'PGRST116') {
                                    console.warn("Consultation not found on server, removing local copy", key);
                                    await offlineStore.removeItem(key);
                                    setPendingSyncIds(prev => prev.filter(id => id !== key));
                                } else {
                                    // Likely a network error or transient server error - DO NOT REMOVE
                                    // We just continue and let the next sync pass retry it
                                    console.error("Transient sync error for key:", key, error);
                                }
                                continue;
                            }

                            if (!serverConsultation) {
                                await offlineStore.removeItem(key);
                                setPendingSyncIds(prev => prev.filter(id => id !== key));
                                continue;
                            }

                            const localTimestamp = new Date(offlineData.timestamp);
                            const serverTimestamp = new Date(serverConsultation.updated_at || serverConsultation.created_at);

                            if (serverTimestamp > localTimestamp) {
                                setConflictData({ local: offlineData, server: serverConsultation, consultationId: key });
                                isSyncingRef.current = false; // Release lock if waiting for user
                                return;
                            } else {
                                // Sync local to server
                                const syncBundle = offlineData as OfflineConsultationRecord;
                                if (!syncBundle.patientDetails?.id) {
                                    throw new Error('Offline sync payload missing patientDetails.id');
                                }

                                const patientUpdate = buildPatientUpdatePayload(syncBundle.patientDetails);
                                const { error: patientUpdateError } = await supabase
                                    .from('patients')
                                    .update(patientUpdate)
                                    .eq('id', syncBundle.patientDetails.id);
                                if (patientUpdateError) throw new Error(`Patient sync failed: ${patientUpdateError.message}`);

                                const consultationUpdate = buildConsultationUpdatePayload({
                                    ...syncBundle,
                                    extraData: syncBundle.extraData || ({} as any),
                                    status: syncBundle.status || 'pending'
                                });
                                const { error: consultationUpdateError } = await supabase
                                    .from('consultations')
                                    .update(consultationUpdate)
                                    .eq('id', key);
                                if (consultationUpdateError) throw new Error(`Consultation sync failed: ${consultationUpdateError.message}`);

                                if (syncBundle.status === 'completed' && serverConsultation.status !== 'completed') {
                                    await sendNotification(syncBundle.patientDetails, syncBundle.extraData || {}, syncBundle.language || offlineData.language || 'te');
                                }

                                await offlineStore.removeItem(key);
                                setPendingSyncIds(prev => prev.filter(id => id !== key));
                            }

                        } catch (e: any) {
                            console.error("Sync error for key:", key, e);
                            if (e?.messsage) console.error("Error message:", e.message);
                            if (e?.details) console.error("Error details:", e.details);
                            if (e?.hint) console.error("Error hint:", e.hint);
                        }
                    }
                }
            } finally {
                isSyncingRef.current = false;
            }
        };

        const interval = setInterval(syncOfflineData, 10000);

        // Immediate Trigger Listener
        if (typeof window !== 'undefined') {
            window.addEventListener(SYNC_NOW_EVENT, syncOfflineData);
        }

        syncOfflineData();
        return () => {
            clearInterval(interval);
            if (typeof window !== 'undefined') {
                window.removeEventListener(SYNC_NOW_EVENT, syncOfflineData);
            }
        };
    }, [isOnline, conflictData, patientConflictData, guides, consultantName, consultantId]);

    // Conflict Resolvers
    const resolveConflict = async (resolution: 'local' | 'server') => {
        if (!conflictData) return;
        const { consultationId, local } = conflictData;

        if (resolution === 'server') {
            await offlineStore.removeItem(consultationId);
        } else { // local
            const localBundle = local as OfflineConsultationRecord;
            if (!localBundle.patientDetails?.id) {
                throw new Error('Conflict payload missing patientDetails.id');
            }
            const patientUpdatePayload = buildPatientUpdatePayload(localBundle.patientDetails);
            const { error: patientUpdateError } = await supabase
                .from('patients')
                .update(patientUpdatePayload)
                .eq('id', localBundle.patientDetails.id);
            if (patientUpdateError) throw new Error(`Patient sync failed: ${patientUpdateError.message}`);

            const consultationUpdatePayload = buildConsultationUpdatePayload({
                ...localBundle,
                extraData: localBundle.extraData || ({} as any),
                status: localBundle.status || 'pending'
            });
            const { error: consultationUpdateError } = await supabase
                .from('consultations')
                .update(consultationUpdatePayload)
                .eq('id', consultationId);
            if (consultationUpdateError) throw new Error(`Consultation sync failed: ${consultationUpdateError.message}`);

            await offlineStore.removeItem(consultationId);
        }
        setPendingSyncIds(prev => prev.filter(id => id !== consultationId));
        setConflictData(null);
    };

    const resolvePatientConflict = async (resolution: 'new' | { mergeWith: number }) => {
        if (!patientConflictData) return;
        const { consultationId, offlinePatient } = patientConflictData;
        let patientIdToUse;

        if (resolution === 'new') {
            const { data, error } = await supabase.functions.invoke('register-patient-and-consultation', {
                body: { ...offlinePatient },
            });
            if (error) throw new Error(error.message);
            patientIdToUse = data.consultation.patient_id;
        } else {
            patientIdToUse = resolution.mergeWith;
        }

        const offlineBundle = await offlineStore.getItem(consultationId) as OfflineConsultationRecord | null;
        if (!offlineBundle) {
            console.warn('Missing offline bundle during patient conflict resolution:', consultationId);
            setPendingSyncIds(prev => prev.filter(id => id !== consultationId));
            setPatientConflictData(null);
            return;
        }
        const consultationInsertPayload = buildConsultationUpdatePayload({
            ...offlineBundle,
            extraData: offlineBundle.extraData || { medications: [] },
            status: 'pending' // Insert new patient-linked consultations as pending
        });

        const { error: consultationError } = await supabase
            .from('consultations')
            .insert({
                ...consultationInsertPayload,
                patient_id: patientIdToUse,
            });

        if (consultationError) throw new Error(consultationError.message);

        await offlineStore.removeItem(consultationId);
        setPendingSyncIds(prev => prev.filter(id => id !== consultationId));
        setPatientConflictData(null);
    };

    return {
        pendingSyncIds,
        setPendingSyncIds,
        conflictData,
        setConflictData,
        patientConflictData,
        setPatientConflictData,
        resolveConflict,
        resolvePatientConflict
    };
};
