import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (result.success && result.user) {
      // Find role and redirect
      const user = result.user;
      if (user.role === 'admin') {
        navigate('/admin-dashboard');
      } else if (user.role === 'pharmacy') {
        navigate('/pharmacy-dashboard');
      } else {
        navigate('/patient-dashboard');
      }
    } else {
      setError(result.message || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 relative z-10 bg-slate-50">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-red-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md p-8 rounded-2xl light-card shadow-lg relative z-10">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Welcome Back</h2>
          <p className="text-slate-550 text-sm mt-2">Sign in to search, list, or approve rare medicines.</p>
        </div>

        {error && (
          <div className="flex items-center space-x-2 p-3 mb-6 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email input */}
          <div>
            <label className="block text-slate-600 text-xs font-semibold uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-sm"
                required
              />
            </div>
          </div>

          {/* Password input */}
          <div>
            <label className="block text-slate-600 text-xs font-semibold uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-sm"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-md shadow-red-550/10 flex items-center justify-center gap-2 hover:scale-[1.01] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-8"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Logging in...
              </>
            ) : (
              <>
                Sign In <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-500 border-t border-slate-200 pt-6">
          <span>Don't have an account? </span>
          <Link to="/register" className="text-red-650 font-semibold hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
