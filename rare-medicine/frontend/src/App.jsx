import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import PatientDashboard from './pages/PatientDashboard';
import PharmacyDashboard from './pages/PharmacyDashboard';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="flex flex-col min-h-screen bg-slate-50 text-slate-850 selection:bg-red-500/20 selection:text-red-900">
          <Navbar />
          <div className="flex-grow">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected Patient Routes */}
              <Route
                path="/patient-dashboard"
                element={
                  <PrivateRoute allowedRoles={['patient']}>
                    <PatientDashboard />
                  </PrivateRoute>
                }
              />

              {/* Protected Pharmacy Routes */}
              <Route
                path="/pharmacy-dashboard"
                element={
                  <PrivateRoute allowedRoles={['pharmacy']}>
                    <PharmacyDashboard />
                  </PrivateRoute>
                }
              />

              {/* Protected Admin Routes */}
              <Route
                path="/admin-dashboard"
                element={
                  <PrivateRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </PrivateRoute>
                }
              />

              {/* Fallback Route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
