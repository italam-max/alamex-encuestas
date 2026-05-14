import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { ReactNode } from 'react';

// Layouts
import AppShell      from '../components/layout/AppShell';

// Páginas privadas
import Dashboard     from '../features/surveys/Dashboard';
import SurveyList    from '../features/surveys/SurveyList';
import SurveyBuilder from '../features/builder/SurveyBuilder';
import SurveyDetail  from '../features/surveys/SurveyDetail';
import Analytics     from '../features/analytics/Analytics';
import Settings      from '../features/settings/Settings';

// Páginas públicas
import SurveyPage    from '../features/public/SurveyPage';
import ThanksPage    from '../features/public/ThanksPage';

// Login
import LoginPage     from '../features/auth/LoginPage';

// Guard de rutas privadas
function PrivateRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#F9F7F2]">
      <div className="w-8 h-8 rounded-full border-2 border-[#D4AF37] border-t-transparent animate-spin" />
    </div>
  );
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export const router = createBrowserRouter([
  // ── Rutas públicas ──────────────────────────────────────────────
  { path: '/login',            element: <LoginPage /> },
  { path: '/s/:token',         element: <SurveyPage /> },
  { path: '/s/:token/gracias', element: <ThanksPage /> },

  // ── Rutas privadas (dentro del AppShell) ────────────────────────
  {
    path: '/',
    element: (
      <PrivateRoute>
        <AppShell />
      </PrivateRoute>
    ),
    children: [
      { index: true,                  element: <Dashboard /> },
      { path: 'surveys',              element: <SurveyList /> },
      { path: 'surveys/new',          element: <SurveyBuilder /> },
      { path: 'surveys/:id',          element: <SurveyDetail /> },
      { path: 'surveys/:id/editar',   element: <SurveyBuilder /> },
      { path: 'analytics',            element: <Analytics /> },
      { path: 'settings',             element: <Settings /> },
    ],
  },

  // Fallback
  { path: '*', element: <Navigate to="/" replace /> },
]);
