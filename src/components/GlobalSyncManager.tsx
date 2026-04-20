
import React from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Badge } from '@/components/ui/badge';
import { Loader2, CloudOff, CloudUpload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocation } from 'react-router-dom';
import { useConsultant } from '@/context/ConsultantContext';

import { ConflictResolutionModal } from '@/components/consultation/ConflictResolutionModal';
import { PatientConflictModal } from '@/components/consultation/PatientConflictModal';

export const GlobalSyncManager = () => {
    const isOnline = useOnlineStatus();
    const location = useLocation();

    const { consultant } = useConsultant();
    // Whitelist paths where we show the sync status (mainly admin/staff pages)
    // Hiding it on public pages to avoid confusion
    const showSyncStatus = [
        '/op', '/registration', '/ip', '/pharmacy', '/diagnostics', '/admin'
    ].some(path => location.pathname.toLowerCase().includes(path));

    const finalConsultantId = consultant?.is_legacy_handler ? "legacy" : consultant?.id;
    const {
        conflictData,
        setConflictData,
        resolveConflict,
        patientConflictData,
        setPatientConflictData,
        resolvePatientConflict
    } = useOfflineSync({ 
      isOnline, 
      consultantName: consultant?.name as any, 
      consultantId: finalConsultantId,
      isWhatsAutoActive: consultant?.is_whatsauto_active
    });

    const content = (
        <>
            {conflictData && (
                <ConflictResolutionModal
                    isOpen={!!conflictData}
                    onClose={() => setConflictData(null)}
                    onResolve={resolveConflict}
                    localData={conflictData.local}
                    serverData={conflictData.server}
                />
            )}
            {patientConflictData && (
                <PatientConflictModal
                    isOpen={!!patientConflictData}
                    onClose={() => setPatientConflictData(null)}
                    onResolve={resolvePatientConflict}
                    offlinePatient={patientConflictData.offlinePatient}
                    conflictingPatients={patientConflictData.conflictingPatients}
                />
            )}
        </>
    );

    if (!showSyncStatus) return content; // Still render modals even if badge is hidden? Yes, conflicts block sync.

    if (!isOnline) {
        return (
            <>
                {content}
                <div className="fixed bottom-4 right-4 z-50">
                    <Badge variant="destructive" className="flex gap-2 items-center py-2 px-3 shadow-lg animate-pulse">
                        <CloudOff className="h-4 w-4" />
                        <span>Offline Mode</span>
                    </Badge>
                </div>
            </>
        );
    }

    // Always render content (modals)
    return content;
};
