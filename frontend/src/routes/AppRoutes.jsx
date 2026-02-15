import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/common/ProtectedRoute';

// Pages
import Login from '../pages/auth/Login';
import Signup from '../pages/auth/Signup';
import ForgotPassword from '../pages/auth/ForgotPassword';
import AdminDashboard from '../pages/admin/Dashboard';
import Applications from '../pages/admin/Applications';
import StudentDetail from '../pages/admin/StudentDetail';
import Universities from '../pages/admin/Universities';
import Countries from '../pages/admin/Countries';
import Courses from '../pages/admin/Courses';
import PartnerDashboard from '../pages/partner/Dashboard';
import Students from '../pages/partner/Students';
import NotFound from '../pages/common/NotFound';

/**
 * App Routes Configuration
 */
const AppRoutes = () => {
  const { isAuthenticated, user, loading } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#f9fafb'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e5e7eb',
            borderTopColor: '#2563eb',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p style={{ color: '#6b7280', margin: 0 }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            user?.role === 'ADMIN' ? (
              <Navigate to="/admin/dashboard" replace />
            ) : (
              <Navigate to="/partner/dashboard" replace />
            )
          ) : (
            <Login />
          )
        }
      />
      <Route
        path="/signup"
        element={
          isAuthenticated ? (
            user?.role === 'ADMIN' ? (
              <Navigate to="/admin/dashboard" replace />
            ) : (
              <Navigate to="/partner/dashboard" replace />
            )
          ) : (
            <Signup />
          )
        }
      />
      <Route
        path="/forgot-password"
        element={
          isAuthenticated ? (
            user?.role === 'ADMIN' ? (
              <Navigate to="/admin/dashboard" replace />
            ) : (
              <Navigate to="/partner/dashboard" replace />
            )
          ) : (
            <ForgotPassword />
          )
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <Routes>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="applications" element={<Applications />} />
              <Route path="applications/:id" element={<StudentDetail />} />
              <Route path="universities" element={<Universities />} />
              <Route path="countries" element={<Countries />} />
              <Route path="courses" element={<Courses />} />
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Routes>
          </ProtectedRoute>
        }
      />

      {/* Partner Routes */}
      <Route
        path="/partner/*"
        element={
          <ProtectedRoute allowedRoles={['PARTNER']}>
            <Routes>
              <Route path="dashboard" element={<PartnerDashboard />} />
              <Route path="students" element={<Students />} />
              <Route path="*" element={<Navigate to="/partner/dashboard" replace />} />
            </Routes>
          </ProtectedRoute>
        }
      />

      {/* Root redirect */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            user?.role === 'ADMIN' ? (
              <Navigate to="/admin/dashboard" replace />
            ) : (
              <Navigate to="/partner/dashboard" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* 404 Not Found */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;

