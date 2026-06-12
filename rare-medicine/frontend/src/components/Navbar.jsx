import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Heart, LogOut, ShieldAlert, Award, User, Layers, FileHeart } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Section */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 font-extrabold text-xl font-display tracking-tight hover:opacity-95">
              <Heart className="h-6 w-6 text-red-600 fill-red-600 animate-heartbeat" />
              <span className="text-slate-800">RareMed</span>
              <span className="text-red-600">Locator</span>
            </Link>
          </div>

          {/* Navigation Links based on Login Status & Role */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              to="/"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/') ? 'bg-red-600 text-white' : 'text-slate-600 hover:text-red-650 hover:bg-slate-50'
              }`}
            >
              Home
            </Link>

            {user ? (
              <>
                {/* Patient Navigation */}
                {user.role === 'patient' && (
                  <Link
                    to="/patient-dashboard"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive('/patient-dashboard') ? 'bg-red-600 text-white' : 'text-slate-600 hover:text-red-650 hover:bg-slate-50'
                    }`}
                  >
                    Locate Medicine
                  </Link>
                )}

                {/* Pharmacy Navigation */}
                {user.role === 'pharmacy' && (
                  <Link
                    to="/pharmacy-dashboard"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive('/pharmacy-dashboard') ? 'bg-red-600 text-white' : 'text-slate-600 hover:text-red-650 hover:bg-slate-50'
                    }`}
                  >
                    Pharmacy Portal
                  </Link>
                )}

                {/* Admin Navigation */}
                {user.role === 'admin' && (
                  <Link
                    to="/admin-dashboard"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive('/admin-dashboard') ? 'bg-red-600 text-white' : 'text-slate-600 hover:text-red-650 hover:bg-slate-50'
                    }`}
                  >
                    Admin Console
                  </Link>
                )}
              </>
            ) : null}
          </div>

          {/* User Profile / Auth State */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-3">
                {/* Custom Badge for Role */}
                {user.role === 'pharmacy' && (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    user.pharmacy?.verificationStatus === 'approved'
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : user.pharmacy?.verificationStatus === 'rejected'
                      ? 'bg-red-50 text-red-600 border border-red-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {user.pharmacy?.verificationStatus === 'approved' ? 'Verified' : 'Pending Approval'}
                  </span>
                )}
                {user.role === 'admin' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
                    Admin
                  </span>
                )}

                <div className="flex flex-col text-right">
                  <span className="text-sm font-semibold text-slate-800">
                    {user.role === 'pharmacy' ? user.pharmacy?.pharmacyName : user.name}
                  </span>
                  <span className="text-[10px] text-slate-500 capitalize">{user.role}</span>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-2 rounded-full text-slate-500 hover:text-red-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="px-4 py-1.5 text-sm font-medium text-red-600 border border-red-200 hover:border-red-600 hover:bg-red-50 rounded-lg transition-all"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-1.5 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm shadow-red-550/10 transition-all"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

