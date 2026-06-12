import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, ShieldCheck, MapPin, Search, AlertCircle, ArrowRight, Upload } from 'lucide-react';

const Landing = () => {
  const { user } = useAuth();

  return (
    <div className="relative overflow-hidden min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Background Graphic elements (Subtle Red/Rose) */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-600/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center relative z-10 flex-grow">
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-100 text-xs font-semibold text-red-600 mb-6 animate-fade-in">
          <Activity className="h-4 w-4 text-red-600" />
          <span>Centralized Rare Medicine Directory</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-800 tracking-tight leading-none mb-6">
          Find Rare Lifesaving Medicines{' '}
          <span className="block mt-2 bg-gradient-to-r from-red-650 via-red-500 to-rose-600 bg-clip-text text-transparent">
            Instantly, Near You.
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-lg text-slate-605 mb-10">
          RareMed Locator bridges the gap between rare disease patients and verified pharmacies. Search real-time stock, map nearby pharmacies, and request critical medications instantly.
        </p>

        {/* Call to Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {user ? (
            <Link
              to={
                user.role === 'patient'
                  ? '/patient-dashboard'
                  : user.role === 'pharmacy'
                  ? '/pharmacy-dashboard'
                  : '/admin-dashboard'
              }
              className="px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-md shadow-red-500/10 transition-all duration-300 flex items-center gap-2 hover:scale-[1.02] cursor-pointer"
            >
              Go to Dashboard <ArrowRight className="h-5 w-5" />
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="w-full sm:w-auto px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-md shadow-red-500/10 transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.02] cursor-pointer"
              >
                Get Started <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto px-8 py-3.5 bg-white border border-slate-200 text-slate-600 hover:text-red-650 hover:bg-slate-50 rounded-xl font-bold transition-all duration-300 hover:scale-[1.02] cursor-pointer text-center shadow-sm"
              >
                Log In
              </Link>
            </>
          )}
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 text-left max-w-5xl mx-auto">
          {/* Card 1 */}
          <div className="p-6 rounded-2xl light-card hover:border-red-200 transition-all duration-300 group">
            <div className="h-12 w-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Search className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Location-Based Search</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Find exactly which stores have stock of rare medications like Nusinersen. Sort results nearest-first with direct distance metrics.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-2xl light-card hover:border-red-200 transition-all duration-300 group">
            <div className="h-12 w-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Verified Pharmacies</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Admin verification workflow ensures every pharmacy registers with a valid medical license, eliminating scams and counterfeits.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-2xl light-card hover:border-red-200 transition-all duration-300 group">
            <div className="h-12 w-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Demand Management</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Medicine unavailable? File a digital request instantly. Registered pharmacies will respond when they receive incoming stock.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-200 bg-white text-center text-slate-500 text-xs mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p>© 2026 RareMed Locator. Built for patient assistance & emergency medicine support.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
