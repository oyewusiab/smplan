/**
 * SM Planner — Main Application
 * 
 * Architecture:
 *   Frontend (Vercel) → Google Apps Script Web App → Google Sheets
 * 
 * Configure VITE_APPS_SCRIPT_URL to connect to your Apps Script deployment.
 * See: docs/DEPLOYMENT.md
 */

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PlannersPage } from './pages/PlannersPage';
import { PlannerDetailPage } from './pages/PlannerDetailPage';
import { AgendasPage } from './pages/AgendasPage';
import { AssignmentsPage } from './pages/AssignmentsPage';
import { BulletinPage } from './pages/BulletinPage';
import { MembersPage } from './pages/MembersPage';
import { HymnsPage } from './pages/HymnsPage';
import { ChecklistsPage } from './pages/ChecklistsPage';
import { TodosPage } from './pages/TodosPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { RemindersPage } from './pages/RemindersPage';
import { CalendarPage } from './pages/CalendarPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { UsersPage } from './pages/UsersPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { ArchivePage } from './pages/ArchivePage';
import { SettingsPage } from './pages/SettingsPage';
import { useAuthStore } from './store/authStore';
import { useInactivityTimeout } from './hooks/useInactivityTimeout';
import { canAccessRoute } from './utils/permissions';
import { useEffect } from 'react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RoleRouteGuard({ children, path }: { children: React.ReactNode; path: string }) {
  const { session } = useAuthStore();
  const location = useLocation();

  const allowed = canAccessRoute(session?.role, path || location.pathname);

  useEffect(() => {
    if (session && !allowed) {
      toast.error(`Access restricted: Your role (${session.role}) does not have permission to view ${path}.`, {
        id: `access-denied-${path}`,
      });
    }
  }, [session, allowed, path]);

  if (!session) return <Navigate to="/login" replace />;
  if (!allowed) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}

function AppWithInactivity() {
  // Global 30-minute auto logout listener
  useInactivityTimeout();

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Protected — all inside AppLayout */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        
        <Route
          path="/planners"
          element={
            <RoleRouteGuard path="/planners">
              <PlannersPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="/planners/:id"
          element={
            <RoleRouteGuard path="/planners">
              <PlannerDetailPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="/agendas"
          element={
            <RoleRouteGuard path="/agendas">
              <AgendasPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="/assignments"
          element={
            <RoleRouteGuard path="/assignments">
              <AssignmentsPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="/bulletins"
          element={
            <RoleRouteGuard path="/bulletins">
              <BulletinPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="/members"
          element={
            <RoleRouteGuard path="/members">
              <MembersPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="/hymns"
          element={
            <RoleRouteGuard path="/music">
              <HymnsPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="/music"
          element={
            <RoleRouteGuard path="/music">
              <HymnsPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="/checklists"
          element={
            <RoleRouteGuard path="/checklists">
              <ChecklistsPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="/todos"
          element={
            <RoleRouteGuard path="/todos">
              <TodosPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="/notifications"
          element={
            <RoleRouteGuard path="/notifications">
              <NotificationsPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="/reminders"
          element={
            <RoleRouteGuard path="/reminders">
              <RemindersPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="/calendar"
          element={
            <RoleRouteGuard path="/calendar">
              <CalendarPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="/approvals"
          element={
            <RoleRouteGuard path="/approvals">
              <ApprovalsPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="/users"
          element={
            <RoleRouteGuard path="/users">
              <UsersPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="/audit"
          element={
            <RoleRouteGuard path="/audit">
              <AuditLogPage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="/archive"
          element={
            <RoleRouteGuard path="/archive">
              <ArchivePage />
            </RoleRouteGuard>
          }
        />
        <Route
          path="/settings"
          element={
            <RoleRouteGuard path="/settings">
              <SettingsPage />
            </RoleRouteGuard>
          }
        />

        {/* Catch-all inside app */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '12px',
            fontSize: '14px',
            fontFamily: 'inherit',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
      <AppWithInactivity />
    </BrowserRouter>
  );
}
