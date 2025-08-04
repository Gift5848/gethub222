import React from 'react';
import { Navigate } from 'react-router-dom';

// Helper to get user role from localStorage or context (customize as needed)
function getUserRole() {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.role;
  } catch {
    return null;
  }
}

// PrivateRoute for seller
const PrivateRoute = ({ element, allowedRoles = ['seller'] }) => {
  const role = getUserRole();
  if (allowedRoles.includes(role)) {
    return element;
  } else {
    return <Navigate to="/login" replace />;
  }
};

export default PrivateRoute;
