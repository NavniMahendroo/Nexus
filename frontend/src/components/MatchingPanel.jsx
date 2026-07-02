import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BarChart3, Shuffle, CheckCircle, Zap, TrendingUp, Settings, Activity } from 'lucide-react';

export default function MatchingPanel() {
  const { authFetch } = useAuth();
  const [strategy, setStrategy] = useState('greedy');
  const [assignments, setAssignments] = useState([]);
  const [compareData, setCompareData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actioningId, setActioningId] = useState(null);

  const fetchComparison = async () => {
    try {
      const res = await authFetch('http://127.0.0.1:8000/api/matching/compare');
      if (res.ok) {
        const data = await res.json();
        setCompareData(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchComparison();
  }, []);

  const runMatching = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`http://127.0.0.1:8000/api/matching/run?strategy=${strategy}`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setAssignments(data);
        // Refresh benchmark stats
        fetchComparison();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (assignmentId) => {
    setActioningId(assignmentId);
    try {
      const res = await authFetch(`http://127.0.0.1:8000/api/matching/confirm/${assignmentId}`, {
        method: 'POST'
      });
      if (res.ok) {
        // Remove confirmed assignment from local state list
        setAssignments(prev => prev.filter(a => a.id !== assignmentId));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Benchmark stats comparison card */}
      {compareData && (
        <div className="bg-slate-900/30 border border-slate-800/85 p-6 rounded-2xl glass shadow-xl space-y-5 glow-brand-sm">
          <h4 className="font-bold text-xs uppercase tracking-widest text-slate-300 flex items-center gap-2">
            <TrendingUp className="text-brand-400 w-5 h-5 animate-pulse" /> Strategy Optimization Benchmark
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Greedy stats */}
            <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-850 space-y-3">
              <span className="text-[10px] uppercase font-black text-slate-400 font-mono tracking-wider flex items-center gap-1.5">
                Greedy Matching Strategy (O(T*V))
              </span>
              <div className="grid grid-cols-3 gap-3 text-center pt-2 font-mono border-t border-slate-900/60">
                <div>
                  <span className="block text-slate-500 text-[9px] uppercase font-black tracking-wider">Matched</span>
                  <span className="text-base font-bold text-slate-200">{compareData.greedy.matched_count}</span>
                </div>
                <div>
                  <span className="block text-slate-500 text-[9px] uppercase font-black tracking-wider">Coverage</span>
                  <span className="text-base font-bold text-brand-400">{compareData.greedy.total_urgency_weighted_coverage.toFixed(1)}</span>
                </div>
                <div>
                  <span className="block text-slate-500 text-[9px] uppercase font-black tracking-wider">Runtime</span>
                  <span className="text-base font-bold text-slate-400">{compareData.greedy.runtime_ms.toFixed(2)}ms</span>
                </div>
              </div>
            </div>

            {/* Optimal stats */}
            <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-850 space-y-3">
              <span className="text-[10px] uppercase font-black text-brand-400 font-mono tracking-wider flex items-center gap-1.5">
                Optimal Hungarian Algorithm (O(N^3))
              </span>
              <div className="grid grid-cols-3 gap-3 text-center pt-2 font-mono border-t border-slate-900/60">
                <div>
                  <span className="block text-slate-500 text-[9px] uppercase font-black tracking-wider">Matched</span>
                  <span className="text-base font-bold text-slate-200">{compareData.optimal.matched_count}</span>
                </div>
                <div>
                  <span className="block text-slate-500 text-[9px] uppercase font-black tracking-wider">Coverage</span>
                  <span className="text-base font-bold text-emerald-400">{compareData.optimal.total_urgency_weighted_coverage.toFixed(1)}</span>
                </div>
                <div>
                  <span className="block text-slate-500 text-[9px] uppercase font-black tracking-wider">Runtime</span>
                  <span className="text-base font-bold text-slate-400">{compareData.optimal.runtime_ms.toFixed(2)}ms</span>
                </div>
              </div>
            </div>
          </div>
          <div className="text-[9px] font-sans text-slate-500 leading-relaxed">
            * The Hungarian (Optimal) algorithm calculates the global utility maximum to prevent local greedy bottlenecks (e.g. preventing the assignment of highly specialized volunteers to generic tasks, reserving them for critical needs).
          </div>
        </div>
      )}

      {/* Control panel & options */}
      <div className="bg-slate-900/30 border border-slate-800/80 p-6 rounded-2xl glass shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded-xl">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-200 text-sm">Pluggable Engine Execution</h4>
              <p className="text-xs text-slate-500">Trigger matching models and view proposed pending assignments.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              className="bg-slate-950 border border-slate-850 rounded-xl text-xs py-2.5 px-4 text-slate-300 font-semibold focus:outline-none input-premium cursor-pointer"
            >
              <option value="greedy">Greedy Strategy</option>
              <option value="optimal">Optimal (Hungarian)</option>
            </select>

            <button
              onClick={runMatching}
              disabled={loading}
              className="flex items-center justify-center gap-1.5 text-xs text-slate-900 bg-brand-500 hover:bg-brand-600 font-black px-5 py-2.5 rounded-xl cursor-pointer transition-all active:scale-95 shadow-md shadow-brand-500/10"
            >
              {loading ? (
                <span className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-slate-900"></span>
              ) : (
                <Shuffle className="w-3.5 h-3.5 text-slate-950" />
              )}
              Run Match
            </button>
          </div>
        </div>

        {/* Proposed Assignments Table */}
        {assignments.length > 0 ? (
          <div className="overflow-x-auto border border-slate-850 rounded-xl bg-slate-950/40 shadow-inner">
            <table className="min-w-full divide-y divide-slate-900 text-left text-xs font-sans">
              <thead className="bg-slate-950/60 text-slate-500 font-mono text-[9px] uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Task ID</th>
                  <th className="px-5 py-3">Volunteer ID</th>
                  <th className="px-5 py-3">Match Score</th>
                  <th className="px-5 py-3">Explanation Reasoning</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60 text-slate-300 font-medium">
                {assignments.map((asg) => (
                  <tr key={asg.id} className="hover:bg-slate-900/25 transition-all">
                    <td className="px-5 py-4 font-mono font-bold text-slate-400">#{asg.task_id}</td>
                    <td className="px-5 py-4 font-mono font-bold text-slate-400">#{asg.volunteer_id}</td>
                    <td className="px-5 py-4 font-mono font-black text-brand-400">{asg.match_score.toFixed(2)}</td>
                    <td className="px-5 py-4 text-slate-300 max-w-sm truncate text-xs" title={asg.match_reasoning}>
                      {asg.match_reasoning}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleConfirm(asg.id)}
                        disabled={actioningId !== null}
                        className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-green-400 border border-green-500/15 bg-green-500/5 px-3 py-1.5 rounded-xl hover:bg-green-500/10 transition-all cursor-pointer active:scale-95"
                      >
                        {actioningId === asg.id ? (
                          <span className="animate-spin rounded-full h-2.5 w-2.5 border-t border-green-400"></span>
                        ) : (
                          <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                        )}
                        Confirm Proposal
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500 bg-slate-900/10 border border-dashed border-slate-800/80 rounded-2xl glass">
            <Activity className="w-10 h-10 mx-auto text-slate-700 mb-3 animate-pulse" />
            <p className="text-xs font-bold text-slate-400">No active proposed assignments in local state</p>
            <p className="text-[10px] text-slate-500 mt-1">Select a matching strategy and click "Run Match" above to generate pairings.</p>
          </div>
        )}
      </div>
    </div>
  );
}
