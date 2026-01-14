import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineStore } from '@/lib/local-storage';

interface UseOfflineSyncProps {
    isOnline: boolean;
    sendConsultationCompletionNotification: (patient: any, guidesMatched: any[]) => Promise<void>;
    matchedGuides: any[];
}
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
 * 
 * @param isOnline Boolean indicating network status.
 * @param sendConsultationCompletionNotification Callback to send notifications on sync completion.
 * @param matchedGuides Guides data needed for notifications.
 */
export const useOfflineSync = ({ isOnline, sendConsultationCompletionNotification, matchedGuides }: UseOfflineSyncProps) => {
    const [pendingSyncIds, setPendingSyncIds] = useState<string[]>([]);
    const [conflictData, setConflictData] = useState<{ local: any, server: any, consultationId: string } | null>(null);
    const [patientConflictData, setPatientConflictData] = useState<{ consultationId: string, offlinePatient: any, conflictingPatients: any[] } | null>(null);

    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        const syncOfflineData = async () => {
            if (!isOnline) return;
            if (conflictData || patientConflictData) return;
            if (isSyncing) return;

            setIsSyncing(true);
            try {
                const keys = await offlineStore.keys();
                if (keys.length > 0) {
                    const pending = keys.filter(k => k !== 'autofill_keywords');
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

                                const matchingPatient = (await supabase.from('patients').select('*').eq('phone', offlineData.patient.phone).maybeSingle()).data;
                                if (matchingPatient) {
                                    setPatientConflictData({ consultationId: key, offlinePatient: offlineData.patient, conflictingPatients: [matchingPatient] });
                                    setIsSyncing(false); // Release lock if waiting for user
                                    return;
                                } else {
                                    // Register patient
                                    // Strip the offline ID so the server generates a proper one
                                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                    const { id: _offlineId, ...patientDataToRegister } = offlineData.patient;

                                    const { data, error } = await supabase.functions.invoke('register-patient-and-consultation', {
                                        body: { ...patientDataToRegister },
                                    });
                                    if (error) throw error;

                                    // Update the automatically created consultation with actual data
                                    const createdConsultationId = data.consultation.id;
                                    const createdPatientId = data.consultation.patient_id;

                                    if (createdConsultationId) {
                                        console.log("Updating sync-created consultation:", createdConsultationId);
                                        const { error: updateError } = await supabase.from('consultations').update({
                                            consultation_data: offlineData.consultationData || {},
                                            status: offlineData.status || 'pending'
                                        }).eq('id', createdConsultationId);

                                        if (updateError) throw updateError;

                                        // RE-KEYING STRATEGY:
                                        // Look for any other offline items (consultation edits) that reference this temporary offline ID.
                                        // We need to point them to the REAL patient ID and REAL consultation ID.
                                        // Then check if the key is 'offline-consultation-...' and RENAME it to the real consultation UUID.
                                        // This ensures the next loop iteration sees it as an "Existing Consultation Update" rather than a "New Insert".

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
                                                if (otherItem.patientDetails) otherItem.patientDetails.id = createdPatientId;
                                                // We don't explicitly store patient_id in the item root usually, but if we did:
                                                if (otherItem.patient_id) otherItem.patient_id = createdPatientId;

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
                                }
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
                                    visit_type: extraData.visit_type || 'paid'
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

                            if (error || !serverConsultation) {
                                await offlineStore.removeItem(key);
                                setPendingSyncIds(prev => prev.filter(id => id !== key));
                                continue;
                            }

                            const localTimestamp = new Date(offlineData.timestamp);
                            const serverTimestamp = new Date(serverConsultation.updated_at || serverConsultation.created_at);

                            if (serverTimestamp > localTimestamp) {
                                setConflictData({ local: offlineData, server: serverConsultation, consultationId: key });
                                setIsSyncing(false); // Release lock if waiting for user
                                return;
                            } else {
                                // Sync local to server
                                const { patientDetails, extraData, status } = offlineData;
                                await supabase.from('patients').update({
                                    name: patientDetails.name, dob: patientDetails.dob, sex: patientDetails.sex, phone: patientDetails.phone
                                }).eq('id', patientDetails.id);

                                await supabase.from('consultations').update({
                                    consultation_data: extraData,
                                    status: status
                                }).eq('id', key);

                                if (status === 'completed' && serverConsultation.status !== 'completed') {
                                    sendConsultationCompletionNotification(patientDetails, matchedGuides);
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
                setIsSyncing(false);
            }
        };

        const interval = setInterval(syncOfflineData, 10000);
        syncOfflineData();
        return () => clearInterval(interval);
    }, [isOnline, conflictData, patientConflictData, matchedGuides, sendConsultationCompletionNotification, isSyncing]);

    // Conflict Resolvers
    const resolveConflict = async (resolution: 'local' | 'server') => {
        if (!conflictData) return;
        const { consultationId, local } = conflictData;

        if (resolution === 'server') {
            await offlineStore.removeItem(consultationId);
        } else { // local
            const { patientDetails, extraData, status } = local;
            const { error: patientUpdateError } = await supabase
                .from('patients')
                .update({ name: patientDetails.name, dob: patientDetails.dob, sex: patientDetails.sex, phone: patientDetails.phone })
                .eq('id', patientDetails.id);
            if (patientUpdateError) throw new Error(`Patient sync failed: ${patientUpdateError.message}`);

            const { error: consultationUpdateError } = await supabase
                .from('consultations')
                .update({ consultation_data: extraData, status: status })
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

        const offlineConsultationData = (await offlineStore.getItem(consultationId) as any).consultation;

        const { error: consultationError } = await supabase
            .from('consultations')
            .insert({
                patient_id: patientIdToUse,
                consultation_data: offlineConsultationData?.consultation_data || {},
                status: 'pending'
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
