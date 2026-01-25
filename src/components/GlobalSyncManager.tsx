
import React from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Badge } from '@/components/ui/badge';
import { Loader2, CloudOff, CloudUpload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocation } from 'react-router-dom';

import { ConflictResolutionModal } from '@/components/consultation/ConflictResolutionModal';
import { PatientConflictModal } from '@/components/consultation/PatientConflictModal';

export const GlobalSyncManager = () => {
    const isOnline = useOnlineStatus();
    const location = useLocation();

    // Whitelist paths where we show the sync status (mainly admin/staff pages)
    // Hiding it on public pages to avoid confusion
    const showSyncStatus = [
        '/op', '/badam', '/laxmi', '/ortholife', '/ip', '/pharmacy', '/diagnostics', '/admin'
    ].some(path => location.pathname.includes(path));

    const {
        pendingSyncIds,
        conflictData,
        setConflictData,
        resolveConflict,
        patientConflictData,
        setPatientConflictData,
        resolvePatientConflict
    } = useOfflineSync({ isOnline });

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

    if (pendingSyncIds.length > 0) {
        return (
            <>
                {content}
                <div className="fixed bottom-4 right-4 z-50">
                    <Badge variant="secondary" className="flex gap-2 items-center py-2 px-3 shadow-lg bg-blue-100 text-blue-800 border-blue-200">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Syncing {pendingSyncIds.length} item(s)...</span>
                    </Badge>
                </div>
            </>
        );
    }

    // Return content (modals) even if no badge
    return content;
};
