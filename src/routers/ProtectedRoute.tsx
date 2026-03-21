import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  element: React.ReactElement;
  requiredRole?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ element, requiredRole }) => {
  const adminToken = localStorage.getItem('adminToken');
  const userToken = localStorage.getItem('userToken');
  const userRole = localStorage.getItem('userRole');

  // Check if user is authenticated (either admin or user token)
  const isAuthenticated = adminToken || userToken;

  if (!isAuthenticated) {
    // Redirect to appropriate login page
    if (requiredRole === 'User') {
      return <Navigate to="/login-user" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  // Check if user has the required role
  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/error?type=403&message=Bạn không có quyền truy cập trang này" replace />;
  }

  return element;
};

export default ProtectedRoute;
