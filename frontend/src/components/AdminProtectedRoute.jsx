import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AdminProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!user) {
    // Not logged in, redirect to login page
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'admin') {
    // Logged in but not an admin, redirect to dashboard with a message
    return <Navigate to="/dashboard" replace state={{ message: 'Access denied. Admin privileges required.' }} />;
  }

  // User is authenticated and is an admin
  return children;
};

export default AdminProtectedRoute;