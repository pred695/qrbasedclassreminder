import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '@store/authStore';
import Spinner from '@components/shared/Spinner';
import { useEffect } from 'react';

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
    const location = useLocation();

    useEffect(() => {
        // Check auth status on mount
        checkAuth();
    }, []);

    // Show loading spinner while checking authentication
    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="text-center">
                    <Spinner size="lg" />
                    <p className="mt-4 text-muted-foreground">Verifying authentication...</p>
                </div>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
};

export default ProtectedRoute;
