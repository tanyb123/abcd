import { Navigate, Route, Routes } from 'react-router-dom';
import DashboardPage from './pages/dashboard/Dashboard';
import LoginPage from './pages/login/LoginPage';
import QuotationPage from './pages/quotation/QuotationPage';
import ManualQuotationPage from './pages/quotation/ManualQuotationPage';
import FinalizeQuotationPage from './pages/quotation/FinalizeQuotationPage';
import ProjectDetailPage from './pages/project/ProjectDetailPage';
import EmailSettingsPage from './pages/settings/EmailSettingsPage';
import AppLayout from './components/Layout/AppLayout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';

// Component bảo vệ route - phải nằm trong AuthProvider và NotificationProvider
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn, loadingAuth } = useAuth();

  if (loadingAuth) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Đang tải...</div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/settings/email" element={<EmailSettingsPage />} />
        <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        <Route
          path="/projects/:projectId/quotation"
          element={<QuotationPage />}
        />
        <Route
          path="/projects/:projectId/quotation/manual"
          element={<ManualQuotationPage />}
        />
        <Route
          path="/projects/:projectId/quotation/finalize"
          element={<FinalizeQuotationPage />}
        />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppRoutes />
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;





