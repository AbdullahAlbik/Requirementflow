import { Toaster } from "@/components/ui/toaster"
import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { WorkspaceProvider } from '@/context/WorkspaceContext';
import { RBACProvider } from '@/context/RBACContext';
import AppLayout from '@/components/layout/AppLayout';

// Pages
import Dashboard from '@/pages/Dashboard';
import Workspaces from '@/pages/Workspaces';
import Anforderungen from '@/pages/Anforderungen';
import Stakeholder from '@/pages/Stakeholder';
import QuellenDokumente from '@/pages/QuellenDokumente';
import QuellenSysteme from '@/pages/QuellenSysteme';
import Ermittlung from '@/pages/Ermittlung';
import Reviews from '@/pages/Reviews';
import Aenderungen from '@/pages/Aenderungen';
import Traceability from '@/pages/Traceability';
import Baselines from '@/pages/Baselines';
import Modelle from '@/pages/Modelle';
import Varianten from '@/pages/Varianten';
import Berichte from '@/pages/Berichte';
import Nutzer from '@/pages/Nutzer';
import Einstellungen from '@/pages/Einstellungen';
import Konflikte from '@/pages/Konflikte';
import ActionItems from '@/pages/ActionItems';
import AuditLog from '@/pages/AuditLog';
import Roadmap from '@/pages/Roadmap';
import Mandanten from '@/pages/Mandanten';
import Berechtigungen from '@/pages/Berechtigungen';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  useEffect(() => {
    if (authError?.type === 'auth_required') {
      navigateToLogin?.();
    }
  }, [authError, navigateToLogin]);

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-700 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      return (
        <div className="fixed inset-0 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-gray-200 rounded-lg p-5 text-center space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Anmeldung erforderlich</h2>
            <p className="text-sm text-gray-600">
              Sie werden zur Anmeldung weitergeleitet. Falls keine Weiterleitung erfolgt, klicken Sie bitte auf den Button.
            </p>
            <button
              onClick={() => navigateToLogin?.()}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800"
            >
              Zur Anmeldung
            </button>
          </div>
        </div>
      );
    }
  }

  return (
    <RBACProvider>
    <WorkspaceProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/workspaces" element={<Workspaces />} />
          <Route path="/anforderungen" element={<Anforderungen />} />
          <Route path="/stakeholder" element={<Stakeholder />} />
          <Route path="/quellen/dokumente" element={<QuellenDokumente />} />
          <Route path="/quellen/systeme" element={<QuellenSysteme />} />
          <Route path="/ermittlung" element={<Ermittlung />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/aenderungen" element={<Aenderungen />} />
          <Route path="/traceability" element={<Traceability />} />
          <Route path="/baselines" element={<Baselines />} />
          <Route path="/varianten" element={<Varianten />} />
          <Route path="/modelle" element={<Modelle />} />
          <Route path="/berichte" element={<Berichte />} />
          <Route path="/nutzer" element={<Nutzer />} />
          <Route path="/einstellungen" element={<Einstellungen />} />
          <Route path="/konflikte" element={<Konflikte />} />
          <Route path="/action-items" element={<ActionItems />} />
          <Route path="/audit-log" element={<AuditLog />} />
          <Route path="/roadmap" element={<Roadmap />} />
          <Route path="/mandanten" element={<Mandanten />} />
          <Route path="/berechtigungen" element={<Berechtigungen />} />
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </WorkspaceProvider>
    </RBACProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
