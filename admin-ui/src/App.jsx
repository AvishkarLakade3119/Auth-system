import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import ActiveSessions from './pages/ActiveSessions';
import UserOverrides from './pages/UserOverrides';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import './styles/App.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="app">
          <Routes>
            <Route path="/login" element={<AdminLogin />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="sessions" element={<ActiveSessions />} />
              <Route path="overrides" element={<UserOverrides />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;