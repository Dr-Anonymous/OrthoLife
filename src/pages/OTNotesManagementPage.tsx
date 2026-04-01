import React, { useEffect } from 'react';
import { OTNotesTemplateContent } from '@/components/inpatient/OTNotesTemplateContent';
import { applySeo } from '@/utils/seo';
import { useAuth } from '@/hooks/useAuth';

const OWNER_PHONE = '9866812555';

const OTNotesManagementPage = () => {
    const { user } = useAuth();
    const userPhone = user?.phoneNumber?.slice(-10);
    const isOwner = userPhone === OWNER_PHONE;

    useEffect(() => {
        applySeo({
            title: 'OT Notes Template Management | OrthoLife',
            description: 'Manage and print Operation Theater (OT) notes for various procedures.',
            canonicalPath: '/ot-notes'
        });
    }, []);

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-5xl h-[90vh] border rounded-2xl shadow-xl overflow-hidden bg-card">
                <OTNotesTemplateContent readonly={!isOwner} />
            </div>
        </div>
    );
};

export default OTNotesManagementPage;
