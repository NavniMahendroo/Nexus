import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Check, X, ShieldAlert, Merge, Sparkles } from 'lucide-react';

export default function DuplicateReview() {
  const { authFetch } = useAuth();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const res = await authFetch('http://127.0.0.1:8000/api/admin/duplicate-candidates');
      if (res.ok) {
        const data = await res.json();
        setCandidates(data);
      }
    } catch (err) {
      console.error('Failed to fetch duplicate candidates', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const handleMerge = async (candidateId) => {
    setActioningId(candidateId);
    try {
      const res = await authFetch(`http://127.0.0.1:8000/api/admin/duplicate-candidates/${candidateId}/merge`, {
        method: 'POST'
      });
      if (res.ok) {
        fetchCandidates();
      } else {
        const errData = await res.json();
        alert(`Merge failed: ${errData.detail || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error occurred during merge.');
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (candidateId) => {
    setActioningId(candidateId);
    try {
      const res = await authFetch(`http://127.0.0.1:8000/api/admin/duplicate-candidates/${candidateId}/reject`, {
        method: 'POST'
      });
      if (res.ok) {
        fetchCandidates();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActioningId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-400">
        <span className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-500 mb-2"></span>
        Loading pending duplicates...
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="bg-slate-900/10 border border-slate-800/80 p-12 rounded-2xl text-center text-slate-400 font-sans glass glow-brand-sm">
        <Check className="w-10 h-10 mx-auto text-green-400 mb-3" />
        <span className="text-sm font-bold text-slate-300 block">Deduplication Clean</span>
        <span className="text-xs text-slate-500 mt-1 block">No pending duplicate flags to review. All incoming reports are distinct.</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {candidates.map((cand) => {
        const similarityPct = (cand.similarity_score * 100).toFixed(0);
        return (
          <div 
            key={cand.id} 
            className="bg-slate-900/30 border border-slate-800/80 rounded-2xl overflow-hidden glass shadow-xl hover-card flex flex-col"
          >
            {/* Header info */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-950/60 border-b border-slate-850">
              <span className="text-xs text-slate-200 font-bold tracking-wide flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" /> Conflict Ingestion Review
              </span>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Similarity Index:</span>
                <span className="text-xs font-black font-mono text-amber-400 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20">{similarityPct}% Match</span>
              </div>
            </div>

            {/* Side-by-Side Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-850">
              {/* Primary Report */}
              <div className="p-6 space-y-3 bg-slate-900/10">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-black uppercase tracking-wider text-brand-400 font-mono flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Existing Report (ID: {cand.report.id})
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    Category: {cand.report.category || 'N/A'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans font-medium">
                  {cand.report.description}
                </p>
                <div className="flex gap-4 text-[10px] font-mono text-slate-500 pt-3 border-t border-slate-850/50">
                  <span>Severity: <strong className="text-slate-400">{cand.report.severity}</strong></span>
                  <span>Corroborations: <strong className="text-slate-400">{cand.report.corroboration_count}</strong></span>
                </div>
              </div>

              {/* Duplicate Report */}
              <div className="p-6 space-y-3 bg-slate-950/20">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-black uppercase tracking-wider text-amber-500 font-mono flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Incoming Report (ID: {cand.duplicate_report.id})
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    Category: {cand.duplicate_report.category || 'N/A'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans font-medium">
                  {cand.duplicate_report.description}
                </p>
                <div className="flex gap-4 text-[10px] font-mono text-slate-500 pt-3 border-t border-slate-850/50">
                  <span>Severity: <strong className="text-slate-400">{cand.duplicate_report.severity}</strong></span>
                  <span>Corroborations: <strong className="text-slate-400">{cand.duplicate_report.corroboration_count}</strong></span>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex justify-end gap-3 px-6 py-3 bg-slate-950/40 border-t border-slate-850">
              <button
                onClick={() => handleReject(cand.id)}
                disabled={actioningId !== null}
                className="flex items-center gap-1.5 text-xs text-red-400 font-bold px-4 py-2 rounded-xl border border-red-500/15 bg-red-500/5 hover:bg-red-500/10 cursor-pointer transition-all active:scale-95"
              >
                <X className="w-4 h-4" /> Reject (Keep Distinct)
              </button>
              <button
                onClick={() => handleMerge(cand.id)}
                disabled={actioningId !== null}
                className="flex items-center gap-1.5 text-xs text-slate-900 bg-brand-500 hover:bg-brand-600 font-bold px-5 py-2 rounded-xl cursor-pointer transition-all active:scale-95 shadow-md shadow-brand-500/10"
              >
                {actioningId === cand.id ? (
                  <span className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-slate-900"></span>
                ) : (
                  <Merge className="w-4 h-4 text-slate-950" />
                )}
                Merge & Promote to Task
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
