import React, { useEffect } from 'react';
import { ConsentTemplateContent } from '@/components/inpatient/ConsentTemplateContent';
import { applySeo } from '@/utils/seo';

import { useAuth } from '@/hooks/useAuth';

const OWNER_PHONE = '9866812555';

const ConsentManagementPage = () => {
    const { user } = useAuth();
    const userPhone = user?.phoneNumber?.slice(-10);
    const isOwner = userPhone === OWNER_PHONE;

    useEffect(() => {
        applySeo({
            title: 'Consent Template Management | OrthoLife',
            description: 'Manage and print surgical consent templates for various procedures.',
            canonicalPath: '/consents'
        });
    }, []);

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-5xl h-[90vh] border rounded-2xl shadow-xl overflow-hidden bg-card">
                <ConsentTemplateContent readonly={!isOwner} />
            </div>
        </div>
    );
};

export default ConsentManagementPage;
