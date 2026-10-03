import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/common/Loader';

export const RoleRoute = ({ children, allowedRoles = [], fallbackPath = '/dashboard' }) => {
  const { user, role, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF8F8] flex items-center justify-center">
        <Loader message="Verifying role authorizations..." size="lg" />
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    const isTargetingAdmin = allowedRoles.includes('ADMIN');
    const loginTarget = isTargetingAdmin ? '/admin/login' : '/login';
    return <Navigate to={loginTarget} state={{ from: location }} replace />;
  }

  // Role authorized check
  const currentRole = (role || user.role || '').toUpperCase();
  const isAllowed =
    allowedRoles.length === 0 || allowedRoles.map((r) => r.toUpperCase()).includes(currentRole);

  if (!isAllowed) {
    // If an ordinary user tries to hit admin, send to general dashboard
    // If an admin tries to hit ordinary dashboard, let them or redirect to fallback
    return <Navigate to={fallbackPath} replace />;
  }

  return children;
};

export default RoleRoute;
