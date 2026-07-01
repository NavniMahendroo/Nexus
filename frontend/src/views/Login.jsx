import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Shield, Sparkles, AlertCircle } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await login(usernameInput, passwordInput);
      if (data.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/volunteer');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const autofillDemo = (roleSelected) => {
    if (roleSelected === 'admin') {
      setUsernameInput('admin');
      setPasswordInput('adminpassword');
    } else {
      setUsernameInput('volunteer');
      setPasswordInput('volunteerpassword');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[85vh] p-4 font-sans text-slate-100">
      <div className="w-full max-w-md bg-slate-800/80 border border-slate-700/80 rounded-2xl overflow-hidden glass shadow-2xl p-8 space-y-6">
        
        {/* Upper Brand Info */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-400 mb-2">
            <Shield className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center justify-center gap-1.5">
            Nexus Gateway <Sparkles className="w-4 h-4 text-brand-400" />
          </h2>
          <p className="text-xs text-slate-400">Intelligent Community Ingestion & Matching Platform</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Input credentials form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Username</label>
            <input
              type="text"
              required
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="e.g. admin or volunteer"
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-brand-500/50"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Password</label>
            <input
              type="password"
              required
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-brand-500/50"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full text-xs font-bold text-slate-950 bg-brand-500 hover:bg-brand-600 rounded-lg py-3 cursor-pointer shadow-lg hover:shadow-brand-500/10 transition-all flex items-center justify-center gap-1.5"
          >
            {submitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Quick Demo Autofill section */}
        <div className="border-t border-slate-800/80 pt-4 text-center">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold mb-2">Quick Demo Roles</span>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => autofillDemo('admin')}
              className="text-[10px] bg-slate-900/60 border border-slate-800 text-slate-300 py-1.5 px-3 rounded hover:bg-slate-900 cursor-pointer hover:border-slate-700"
            >
              NGO Staff (Admin)
            </button>
            <button
              onClick={() => autofillDemo('volunteer')}
              className="text-[10px] bg-slate-900/60 border border-slate-800 text-slate-300 py-1.5 px-3 rounded hover:bg-slate-900 cursor-pointer hover:border-slate-700"
            >
              Volunteer
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
