import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Shield, Sparkles, AlertCircle, User, KeyRound, Compass, MapPin, BrainCircuit, GitMerge, CheckCircle2, ChevronRight, Activity } from 'lucide-react';

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
    <div className="min-h-screen flex flex-col lg:flex-row font-sans text-slate-100 selection:bg-brand-500/30">
      
      {/* Insanely Cool Hero Column (Left Side) */}
      <div className="lg:w-7/12 relative flex flex-col justify-between p-8 sm:p-12 lg:p-20 overflow-hidden bg-slate-950 border-r border-slate-900">
        
        {/* Glow gradients behind background */}
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-brand-500/10 blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none"></div>

        {/* Top Branding */}
        <div className="flex items-center gap-3 z-10">
          <div className="h-10 w-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
          <span className="font-mono text-sm font-bold uppercase tracking-widest text-slate-200">NEXUS COMMAND DECK</span>
        </div>

        {/* Main Hero Copy */}
        <div className="space-y-6 my-12 lg:my-0 z-10">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5 animate-pulse" /> Platform Online & Operational
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-slate-200 to-brand-400">
            Intelligent Crisis Logistical Allocator
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xl font-medium">
            Ingest live community need reports, automatically filter duplicates using AI sentence embedding vector comparisons, calculate dynamic score decays, and match volunteers using optimized Hungarian graph matching.
          </p>

          {/* Feature Grid highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-8">
            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-900 hover:border-slate-800 transition-all group">
              <MapPin className="w-5 h-5 text-brand-400 mb-2 group-hover:animate-bounce" />
              <h4 className="text-xs font-bold text-slate-200">Geospatial Intelligence</h4>
              <p className="text-[10px] text-slate-500 mt-1 leading-normal">Live PostGIS indexing, density clustering, and heatmap visualizations.</p>
            </div>
            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-900 hover:border-slate-800 transition-all group">
              <BrainCircuit className="w-5 h-5 text-amber-400 mb-2 group-hover:animate-pulse" />
              <h4 className="text-xs font-bold text-slate-200">Semantic Deduplication</h4>
              <p className="text-[10px] text-slate-500 mt-1 leading-normal">Sentence Transformer vectors flag and group matching reports in real-time.</p>
            </div>
            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-900 hover:border-slate-800 transition-all group">
              <GitMerge className="w-5 h-5 text-emerald-400 mb-2 group-hover:rotate-12 transition-transform" />
              <h4 className="text-xs font-bold text-slate-200">Hungarian Engine</h4>
              <p className="text-[10px] text-slate-500 mt-1 leading-normal">Linear sum assignment solves global utility to prevent resource bottlenecks.</p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center gap-4.5 z-10 border-t border-slate-900 pt-6 mt-6 lg:mt-0 text-slate-500 text-[10px] font-mono font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> SECURE JWT ENGINE</span>
          <span>•</span>
          <span>POSTGIS ACTIVE</span>
          <span>•</span>
          <span>V1.0</span>
        </div>
      </div>

      {/* Interactive Portal Login Access (Right Side) */}
      <div className="lg:w-5/12 flex items-center justify-center p-6 sm:p-12 bg-[#080c14] relative">
        <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-brand-500/5 blur-[90px] pointer-events-none"></div>

        <div className="w-full max-w-md bg-slate-900/30 border border-slate-800/80 rounded-2xl overflow-hidden glass shadow-2xl p-8 sm:p-10 space-y-7 glow-brand hover-card z-10">
          
          {/* Header */}
          <div className="space-y-2">
            <div className="h-12 w-12 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center shadow-lg shadow-brand-500/5">
              <Shield className="w-6 h-6 text-brand-400" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-1.5">
              Portal Access Gateway <Sparkles className="w-4 h-4 text-brand-400 animate-pulse" />
            </h2>
            <p className="text-xs text-slate-400 leading-normal">
              Enter credentials below to access the disaster mapping console or volunteer workspace.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3.5 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-600">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="admin or volunteer"
                  autoComplete="off"
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/10 input-premium"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-600">
                  <KeyRound className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/10 input-premium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full text-xs font-bold text-slate-100 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-600 active:scale-[0.99] rounded-xl py-3.5 cursor-pointer shadow-lg shadow-brand-500/15 hover:brightness-115 transition-all flex items-center justify-center gap-1.5 border border-brand-500/10"
            >
              {submitting ? 'Connecting Command Link...' : 'Access Workspace'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Autofill section */}
          <div className="border-t border-slate-850 pt-5 space-y-3">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest block text-center font-black">Autofill credentials</span>
            <div className="flex gap-2.5">
              <button
                onClick={() => autofillDemo('admin')}
                className="flex-1 text-[10px] bg-slate-950 border border-slate-850 text-slate-300 font-bold py-2.5 px-3 rounded-xl hover:bg-slate-900 cursor-pointer hover:border-slate-750 transition-all flex items-center justify-center gap-1 hover:text-brand-400"
              >
                <Shield className="w-3.5 h-3.5 text-brand-500" /> Admin Console
              </button>
              <button
                onClick={() => autofillDemo('volunteer')}
                className="flex-1 text-[10px] bg-slate-950 border border-slate-850 text-slate-300 font-bold py-2.5 px-3 rounded-xl hover:bg-slate-900 cursor-pointer hover:border-slate-750 transition-all flex items-center justify-center gap-1 hover:text-brand-400"
              >
                <User className="w-3.5 h-3.5 text-brand-500" /> Volunteer Hub
              </button>
            </div>
          </div>

        </div>
      </div>
      
    </div>
  );
}
