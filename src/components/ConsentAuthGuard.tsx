import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import PageLoader from '@/components/PageLoader';
import { toast } from 'sonner';

const OWNER_PHONE = '9866812555';

interface ConsentAuthGuardProps {
    children: React.ReactNode;
}

import { trackEvent } from '@/lib/analytics';

const ConsentAuthGuard = ({ children }: ConsentAuthGuardProps) => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        if (loading) return;

        if (!user) {
            toast.error('Please login to access this page');
            navigate(`/auth?redirect=${location.pathname}`);
            return;
        }

        const userPhone = user.phoneNumber?.slice(-10); // Get last 10 digits

        if (!userPhone) {
            toast.error('Phone number not found');
            navigate('/');
            return;
        }

        // Log access for everyone except owner
        trackEvent({
            eventType: 'consent_portal_access',
            path: location.pathname,
            user_phone: user.phoneNumber,
            user_name: user.displayName,
            details: { action: 'protected_route_access' }
        });

        setIsAuthorized(true);
    }, [user, loading, navigate, location]);

    if (loading || !isAuthorized) {
        return <PageLoader />;
    }

    return <>{children}</>;
};

export default ConsentAuthGuard;
