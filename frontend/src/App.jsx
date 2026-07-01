import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './views/Login';
import AdminDashboard from './views/AdminDashboard';
import VolunteerDashboard from './views/VolunteerDashboard';
import { LogOut, Home, Compass, ShieldAlert } from 'lucide-react';

const PrivateRoute = ({ children, allowedRoles }) => {
  const { token, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-400">
        <span className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-500 mb-2"></span>
        Authenticating session...
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={role === 'admin' ? '/admin' : '/volunteer'} replace />;
  }

  return children;
};

const NavigationBar = () => {
  const { token, role, logout } = useAuth();

  if (!token) return null;

  return (
    <nav className="bg-slate-950/80 border-b border-slate-800/80 px-6 py-4 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md">
      <div className="flex items-center gap-6">
        <span className="font-bold text-slate-100 tracking-wider text-sm flex items-center gap-1.5 uppercase font-mono">
          <Compass className="text-brand-500 w-5 h-5 animate-pulse" /> Nexus Hub
        </span>
        <div className="flex gap-4 text-xs font-semibold">
          {role === 'admin' && (
            <Link to="/admin" className="text-slate-300 hover:text-brand-400 transition-colors flex items-center gap-1">
              <ShieldAlert className="w-4 h-4" /> Admin Console
            </Link>
          )}
          {role === 'volunteer' && (
            <Link to="/volunteer" className="text-slate-300 hover:text-brand-400 transition-colors flex items-center gap-1">
              <Home className="w-4 h-4" /> Volunteer Hub
            </Link>
          )}
        </div>
      </div>

      <button
        onClick={logout}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 font-semibold transition-colors cursor-pointer"
      >
        <LogOut className="w-4 h-4" /> Sign Out
      </button>
    </nav>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
          <NavigationBar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Login />} />
              <Route 
                path="/admin" 
                element={
                  <PrivateRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/volunteer" 
                element={
                  <PrivateRoute allowedRoles={['volunteer']}>
                    <VolunteerDashboard />
                  </PrivateRoute>
                } 
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}
