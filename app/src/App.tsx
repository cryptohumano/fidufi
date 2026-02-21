import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { TrustSelectionProvider } from './contexts/TrustSelectionContext';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { HomePage } from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import { OnboardPage } from './pages/OnboardPage';
import { RegisterAssetPage } from './pages/RegisterAssetPage';
import { AssetsPage } from './pages/AssetsPage';
import { AssetDetailPage } from './pages/AssetDetailPage';
import { AlertsPage } from './pages/AlertsPage';
import { TrustPage } from './pages/TrustPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { FiduciarioDashboardPage } from './pages/dashboards/FiduciarioDashboardPage';
import { ComiteTecnicoDashboardPage } from './pages/dashboards/ComiteTecnicoDashboardPage';
import { AuditorDashboardPage } from './pages/dashboards/AuditorDashboardPage';
import { ReguladorDashboardPage } from './pages/dashboards/ReguladorDashboardPage';
import { BeneficiarioDashboardPage } from './pages/dashboards/BeneficiarioDashboardPage';
import { OrganizationPage } from './pages/OrganizationPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { TrustsManagementPage } from './pages/TrustsManagementPage';
import { ComiteSessionFormPage } from './pages/ComiteSessionFormPage';
import { MonthlyStatementsPage } from './pages/MonthlyStatementsPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TrustSelectionProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/onboard" element={<OnboardPage />} />
              <Route path="/dashboard/fiduciario" element={<FiduciarioDashboardPage />} />
              <Route path="/dashboard/comite-tecnico" element={<ComiteTecnicoDashboardPage />} />
              <Route path="/dashboard/auditor" element={<AuditorDashboardPage />} />
              <Route path="/dashboard/regulador" element={<ReguladorDashboardPage />} />
              <Route path="/dashboard/beneficiario" element={<BeneficiarioDashboardPage />} />
              <Route path="/assets" element={<AssetsPage />} />
              <Route path="/assets/register" element={<RegisterAssetPage />} />
              <Route path="/assets/:id" element={<AssetDetailPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/trusts/:trustId" element={<TrustPage />} />
              <Route path="/trusts/:trustId/organization" element={<OrganizationPage />} />
              <Route path="/trusts/:trustId/sessions/new" element={<ComiteSessionFormPage />} />
              <Route path="/trusts/:trustId/sessions/:sessionId/edit" element={<ComiteSessionFormPage />} />
              <Route path="/trusts/:trustId/statements" element={<MonthlyStatementsPage />} />
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/audit-logs" element={<AuditLogsPage />} />
              <Route path="/trusts/manage" element={<TrustsManagementPage />} />
            </Routes>
          </Layout>
        </TrustSelectionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
