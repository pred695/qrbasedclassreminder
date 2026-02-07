import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '@store/authStore';

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated } = useAuthStore();
    const location = useLocation();

    // Redirect to login if not authenticated (dummy - just checks local state)
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
};

export default ProtectedRoute;
