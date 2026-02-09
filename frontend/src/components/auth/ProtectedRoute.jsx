import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '@store/authStore';

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuthStore();
    const location = useLocation();

    // Show loading state while checking authentication
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Verifying authentication...</p>
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
