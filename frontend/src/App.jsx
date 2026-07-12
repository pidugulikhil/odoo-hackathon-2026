import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import ProtectedRoute from './components/common/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';

// Lazy load pages
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const GoogleAuthPage = lazy(() => import('./pages/GoogleAuthPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const VehicleListPage = lazy(() => import('./pages/vehicles/VehicleListPage'));
const VehicleCreatePage = lazy(() => import('./pages/vehicles/VehicleCreatePage'));
const VehicleEditPage = lazy(() => import('./pages/vehicles/VehicleEditPage'));
const VehicleDetailPage = lazy(() => import('./pages/vehicles/VehicleDetailPage'));
const DriverListPage = lazy(() => import('./pages/drivers/DriverListPage'));
const DriverCreatePage = lazy(() => import('./pages/drivers/DriverCreatePage'));
const DriverEditPage = lazy(() => import('./pages/drivers/DriverEditPage'));
const DriverDetailPage = lazy(() => import('./pages/drivers/DriverDetailPage'));
const TripListPage = lazy(() => import('./pages/trips/TripListPage'));
const TripCreatePage = lazy(() => import('./pages/trips/TripCreatePage'));
const TripDetailPage = lazy(() => import('./pages/trips/TripDetailPage'));
const MaintenanceListPage = lazy(() => import('./pages/maintenance/MaintenanceListPage'));
const MaintenanceCreatePage = lazy(() => import('./pages/maintenance/MaintenanceCreatePage'));
const MaintenanceDetailPage = lazy(() => import('./pages/maintenance/MaintenanceDetailPage'));
const FuelListPage = lazy(() => import('./pages/fuel/FuelListPage'));
const FuelCreatePage = lazy(() => import('./pages/fuel/FuelCreatePage'));
const ExpenseListPage = lazy(() => import('./pages/expenses/ExpenseListPage'));
const ExpenseCreatePage = lazy(() => import('./pages/expenses/ExpenseCreatePage'));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{
        width: 40, height: 40,
        border: '3px solid rgba(16,185,129,0.2)',
        borderTopColor: '#10b981',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/google-auth" element={<GoogleAuthPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Protected routes inside layout */}
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Vehicles */}
          <Route path="/vehicles" element={<VehicleListPage />} />
          <Route path="/vehicles/new" element={<VehicleCreatePage />} />
          <Route path="/vehicles/:id" element={<VehicleDetailPage />} />
          <Route path="/vehicles/:id/edit" element={<VehicleEditPage />} />

          {/* Drivers */}
          <Route path="/drivers" element={<DriverListPage />} />
          <Route path="/drivers/new" element={<DriverCreatePage />} />
          <Route path="/drivers/:id" element={<DriverDetailPage />} />
          <Route path="/drivers/:id/edit" element={<DriverEditPage />} />

          {/* Trips */}
          <Route path="/trips" element={<TripListPage />} />
          <Route path="/trips/new" element={<TripCreatePage />} />
          <Route path="/trips/:id" element={<TripDetailPage />} />

          {/* Maintenance */}
          <Route path="/maintenance" element={<MaintenanceListPage />} />
          <Route path="/maintenance/new" element={<MaintenanceCreatePage />} />
          <Route path="/maintenance/:id" element={<MaintenanceDetailPage />} />

          {/* Fuel */}
          <Route path="/fuel" element={<FuelListPage />} />
          <Route path="/fuel/new" element={<FuelCreatePage />} />

          {/* Expenses */}
          <Route path="/expenses" element={<ExpenseListPage />} />
          <Route path="/expenses/new" element={<ExpenseCreatePage />} />

          {/* Reports */}
          <Route path="/reports" element={<ReportsPage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
