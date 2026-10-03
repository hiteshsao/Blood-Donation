import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import PublicLayout from '../layouts/PublicLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import AdminLayout from '../layouts/AdminLayout';

// Route Guards
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';

// Core Pages
import Landing from '../pages/Landing';
import Login from '../pages/Login';
import AdminLogin from '../pages/AdminLogin';
import Register from '../pages/Register';
import VerifyOtp from '../pages/VerifyOtp';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import NotFound from '../pages/NotFound';

// App Feature Pages
import DashboardOverview from '../pages/DashboardOverview';
import AdminOverview from '../pages/AdminOverview';
import FindBloodPage from '../pages/FindBloodPage';
import BloodRequestsPage from '../pages/BloodRequestsPage';
import ProfilePage from '../pages/ProfilePage';
import DonorHistoryPage from '../pages/DonorHistoryPage';
import InventoryManagementPage from '../pages/InventoryManagementPage';
import AppointmentsPage from '../pages/AppointmentsPage';
import EmergencyAlertsPage from '../pages/EmergencyAlertsPage';
import NotificationsPage from '../pages/NotificationsPage';
import FeedbackPage from '../pages/FeedbackPage';
import HospitalDashboardPage from '../pages/HospitalDashboardPage';
import BloodBankDashboardPage from '../pages/BloodBankDashboardPage';

// Admin Feature Pages
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminUsersPage from '../pages/admin/AdminUsersPage';
import AdminDonorsPage from '../pages/admin/AdminDonorsPage';
import AdminFacilitiesPage from '../pages/admin/AdminFacilitiesPage';
import AdminInventoryPage from '../pages/admin/AdminInventoryPage';
import AdminRequestsPage from '../pages/admin/AdminRequestsPage';
import AdminEmergencyPage from '../pages/admin/AdminEmergencyPage';
import AdminDonationsPage from '../pages/admin/AdminDonationsPage';
import AdminBroadcastPage from '../pages/admin/AdminBroadcastPage';
import AdminReportsPage from '../pages/admin/AdminReportsPage';
import AdminComplaintsPage from '../pages/admin/AdminComplaintsPage';
import AdminAuditLogsPage from '../pages/admin/AdminAuditLogsPage';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* ── 1. PUBLIC GUEST ROUTES (PublicLayout) ── */}
      <Route element={<PublicLayout />}>
        <Route index element={<Landing />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="verify-otp" element={<VerifyOtp />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="404" element={<NotFound />} />
      </Route>

      {/* ── 2. SEPARATE DEDICATED ADMIN LOGIN ── */}
      <Route path="admin/login" element={<AdminLogin />} />

      {/* ── 3. PROTECTED ROLE DASHBOARD ROUTES (DashboardLayout) ── */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<DashboardOverview />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="find-blood" element={<FindBloodPage />} />
        <Route path="donors" element={<FindBloodPage />} />
        <Route path="requests" element={<BloodRequestsPage />} />
        <Route path="emergency" element={<EmergencyAlertsPage />} />
        <Route path="emergency-alerts" element={<EmergencyAlertsPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="history" element={<DonorHistoryPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="feedback" element={<FeedbackPage />} />
        <Route path="inventory" element={<InventoryManagementPage />} />
        <Route path="hospital" element={<HospitalDashboardPage />} />
        <Route path="bloodbank" element={<BloodBankDashboardPage />} />

        {/* /dashboard/* Nested Aliases */}
        <Route path="dashboard/profile" element={<ProfilePage />} />
        <Route path="dashboard/find-blood" element={<FindBloodPage />} />
        <Route path="dashboard/donors" element={<FindBloodPage />} />
        <Route path="dashboard/requests" element={<BloodRequestsPage />} />
        <Route path="dashboard/emergency" element={<EmergencyAlertsPage />} />
        <Route path="dashboard/appointments" element={<AppointmentsPage />} />
        <Route path="dashboard/history" element={<DonorHistoryPage />} />
        <Route path="dashboard/notifications" element={<NotificationsPage />} />
        <Route path="dashboard/feedback" element={<FeedbackPage />} />
        <Route path="dashboard/inventory" element={<InventoryManagementPage />} />
        <Route path="dashboard/hospital" element={<HospitalDashboardPage />} />
        <Route path="dashboard/bloodbank" element={<BloodBankDashboardPage />} />
      </Route>

      {/* ── 4. PROTECTED ADMIN ROUTES (AdminLayout with ADMIN RoleGuard) ── */}
      <Route
        path="admin"
        element={
          <ProtectedRoute redirectTo="/admin/login">
            <RoleRoute allowedRoles={['ADMIN']} fallbackPath="/dashboard">
              <AdminLayout />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="donors" element={<AdminDonorsPage />} />
        <Route path="facilities" element={<AdminFacilitiesPage />} />
        <Route path="inventory" element={<AdminInventoryPage />} />
        <Route path="requests" element={<AdminRequestsPage />} />
        <Route path="emergency" element={<AdminEmergencyPage />} />
        <Route path="donations" element={<AdminDonationsPage />} />
        <Route path="broadcast" element={<AdminBroadcastPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="complaints" element={<AdminComplaintsPage />} />
        <Route path="audit-logs" element={<AdminAuditLogsPage />} />
      </Route>

      {/* ── 5. CATCH-ALL ROUTE ── */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
