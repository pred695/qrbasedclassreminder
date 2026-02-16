import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import StudentSignup from '@pages/StudentSignup';
import AdminDashboard from '@pages/AdminDashboard';
import AdminLogin from '@pages/AdminLogin';
import TemplateManager from '@pages/TemplateManager';
import OptOutConfirmation from '@pages/OptOutConfirmation';
import UnsubscribeFlow from '@pages/UnsubscribeFlow';
import MyRegistrations from '@pages/MyRegistrations';
import ClassRegistration from '@pages/ClassRegistration';
import QRGenerator from '@pages/QRGenerator';
import NotFound from '@pages/NotFound';
import ProtectedRoute from '@components/auth/ProtectedRoute';
import useAuthStore from '@store/authStore';

function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  // Check authentication status on app load
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <>
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <Routes>
        {/* Public Routes */}
        <Route path="/signup" element={<StudentSignup />} />
        <Route path="/signup/:classType" element={<StudentSignup />} />
        <Route path="/opt-out/:studentId" element={<OptOutConfirmation />} />
        <Route path="/unsubscribe" element={<UnsubscribeFlow />} />
        <Route path="/my-registrations" element={<MyRegistrations />} />
        <Route path="/login" element={<AdminLogin />} />

        {/* Protected Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/templates"
          element={
            <ProtectedRoute>
              <TemplateManager />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/qr-generator"
          element={
            <ProtectedRoute>
              <QRGenerator />
            </ProtectedRoute>
          }
        />

        {/* Default - Student Registration */}
        <Route path="/" element={<ClassRegistration />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default App;

