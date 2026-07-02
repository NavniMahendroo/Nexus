import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Copy, Check, X, ShieldAlert, Layers } from 'lucide-react';

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
      <div className="bg-slate-800/40 border border-slate-700/50 p-8 rounded-xl text-center text-slate-400 font-sans glass">
        <Check className="w-8 h-8 mx-auto text-green-500 mb-2" />
        No pending duplicate flags to review. All incoming reports are semantically distinct!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {candidates.map((cand) => {
        const similarityPct = (cand.similarity_score * 100).toFixed(0);
        return (
          <div 
            key={cand.id} 
            className="bg-slate-800 border border-slate-700/80 rounded-xl overflow-hidden glass shadow-lg flex flex-col"
          >
            {/* Header info */}
            <div className="flex items-center justify-between px-6 py-3 bg-slate-900/60 border-b border-slate-800">
              <span className="text-xs text-brand-400 font-semibold tracking-wide flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-orange-400" /> Potential Conflict Flagged
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono">Similarity:</span>
                <span className="text-sm font-bold font-mono text-orange-400">{similarityPct}% Match</span>
              </div>
            </div>

            {/* Side-by-Side Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800">
              {/* Primary Report */}
              <div className="p-5 space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span className="font-semibold uppercase tracking-wider text-brand-500 font-mono">Existing Report (ID: {cand.report.id})</span>
                  <span>Category: <strong className="text-slate-200">{cand.report.category}</strong></span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed font-sans">{cand.report.description}</p>
                <div className="flex gap-4 text-xs font-mono text-slate-400 pt-2">
                  <span>Severity: <strong className="text-slate-300">{cand.report.severity}</strong></span>
                  <span>Corroborations: <strong className="text-slate-300">{cand.report.corroboration_count}</strong></span>
                </div>
              </div>

              {/* Duplicate Report */}
              <div className="p-5 space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span className="font-semibold uppercase tracking-wider text-orange-500 font-mono">Incoming Report (ID: {cand.duplicate_report.id})</span>
                  <span>Category: <strong className="text-slate-200">{cand.duplicate_report.category}</strong></span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed font-sans">{cand.duplicate_report.description}</p>
                <div className="flex gap-4 text-xs font-mono text-slate-400 pt-2">
                  <span>Severity: <strong className="text-slate-300">{cand.duplicate_report.severity}</strong></span>
                  <span>Corroborations: <strong className="text-slate-300">{cand.duplicate_report.corroboration_count}</strong></span>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex justify-end gap-3 px-6 py-3 bg-slate-900/30 border-t border-slate-800">
              <button
                onClick={() => handleReject(cand.id)}
                disabled={actioningId !== null}
                className="flex items-center gap-1.5 text-xs text-red-400 font-semibold px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" /> Keep Distinct
              </button>
              <button
                onClick={() => handleMerge(cand.id)}
                disabled={actioningId !== null}
                className="flex items-center gap-1.5 text-xs text-green-400 font-semibold px-4 py-1.5 rounded-lg border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 transition-all cursor-pointer"
              >
                {actioningId === cand.id ? (
                  <span className="animate-spin rounded-full h-3 w-3 border-t-2 border-green-400"></span>
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                Merge to Task
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
