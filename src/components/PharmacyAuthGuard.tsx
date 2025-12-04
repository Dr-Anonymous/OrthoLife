import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import PageLoader from '@/components/PageLoader';
import { toast } from 'sonner';

interface PharmacyAuthGuardProps {
    children: React.ReactNode;
    allowedRoles: ('owner' | 'supplier')[];
}

const OWNER_PHONE = '9866812555';
const SUPPLIER_PHONE = '9494712743';

const PharmacyAuthGuard = ({ children, allowedRoles }: PharmacyAuthGuardProps) => {
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

        const isOwner = userPhone === OWNER_PHONE;
        const isSupplier = userPhone === SUPPLIER_PHONE;

        let hasAccess = false;

        if (allowedRoles.includes('owner') && isOwner) {
            hasAccess = true;
        }

        if (allowedRoles.includes('supplier') && isSupplier) {
            hasAccess = true;
        }

        if (hasAccess) {
            setIsAuthorized(true);
        } else {
            toast.error('You are not authorized to access this page');
            navigate('/');
        }
    }, [user, loading, navigate, location, allowedRoles]);

    if (loading || !isAuthorized) {
        return <PageLoader />;
    }

    return <>{children}</>;
};

export default PharmacyAuthGuard;
