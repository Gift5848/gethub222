import React from 'react';
import { Route, Redirect } from 'react-router-dom';

// Helper to get user role and status from localStorage or context (customize as needed)
function getUserStatus() {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    return {
      role: user?.role,
      active: user?.active,
      approved: user?.approved
    };
  } catch {
    return {};
  }
}

// PrivateRoute for seller
const PrivateRoute = ({ component: Component, allowedRoles = ['seller'], requireActive = false, requireApproved = false, ...rest }) => (
  <Route
    {...rest}
    render={props => {
      const { role, active, approved } = getUserStatus();
      if (
        allowedRoles.includes(role) &&
        (!requireActive || active === true) &&
        (!requireApproved || approved === true)
      ) {
        return <Component {...props} />;
      } else {
        return <Redirect to={role === 'subadmin' ? '/pending-approval' : '/login'} />;
      }
    }}
  />
);

export default PrivateRoute;
