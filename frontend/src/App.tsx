import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { DashboardPage } from './pages/DashboardPage';
import { GuestsPage } from './pages/GuestsPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { TablesPage } from './pages/TablesPage';
import { InvitationsPage } from './pages/InvitationsPage';
import { PublicInvitationPage } from './pages/PublicInvitationPage';
import { SchedulePage } from './pages/SchedulePage';
import { SettingsPage } from './pages/SettingsPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-600" />
      </div>
    );
  }
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-600" />
      </div>
    );
  }
  return user ? <Navigate to="/projects" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/invite/:token" element={<PublicInvitationPage />} />
          <Route path="/projects" element={<PrivateRoute><ProjectsPage /></PrivateRoute>} />
          <Route
            path="/projects/:projectId"
            element={<PrivateRoute><AppLayout /></PrivateRoute>}
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="guests" element={<GuestsPage />} />
            <Route path="expenses" element={<ExpensesPage />} />
            <Route path="tables" element={<TablesPage />} />
            <Route path="invitations" element={<InvitationsPage />} />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/projects" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
