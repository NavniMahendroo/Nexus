import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BarChart3, Shuffle, CheckCircle, Zap, TrendingUp, Settings } from 'lucide-react';

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
        <div className="bg-slate-800 border border-slate-700/80 p-5 rounded-xl glass shadow-lg space-y-4">
          <h4 className="font-semibold text-sm text-slate-200 flex items-center gap-2">
            <TrendingUp className="text-brand-500 w-5 h-5" /> Strategy Optimization Benchmark
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Greedy stats */}
            <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800 space-y-2">
              <span className="text-xs uppercase font-bold text-slate-400 font-mono flex items-center gap-1.5">
                Greedy Matching Strategy (O(T*V))
              </span>
              <div className="grid grid-cols-3 gap-2 text-center pt-2 font-mono">
                <div>
                  <span className="block text-slate-400 text-[10px] uppercase font-bold">Matched</span>
                  <span className="text-lg font-bold text-slate-200">{compareData.greedy.matched_count}</span>
                </div>
                <div>
                  <span className="block text-slate-400 text-[10px] uppercase font-bold">Coverage</span>
                  <span className="text-lg font-bold text-brand-400">{compareData.greedy.total_urgency_weighted_coverage.toFixed(1)}</span>
                </div>
                <div>
                  <span className="block text-slate-400 text-[10px] uppercase font-bold">Runtime</span>
                  <span className="text-lg font-bold text-slate-300">{compareData.greedy.runtime_ms.toFixed(2)}ms</span>
                </div>
              </div>
            </div>

            {/* Optimal stats */}
            <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800 space-y-2">
              <span className="text-xs uppercase font-bold text-brand-400 font-mono flex items-center gap-1.5">
                Optimal Hungarian Algorithm (O(N^3))
              </span>
              <div className="grid grid-cols-3 gap-2 text-center pt-2 font-mono">
                <div>
                  <span className="block text-slate-400 text-[10px] uppercase font-bold">Matched</span>
                  <span className="text-lg font-bold text-slate-200">{compareData.optimal.matched_count}</span>
                </div>
                <div>
                  <span className="block text-slate-400 text-[10px] uppercase font-bold">Coverage</span>
                  <span className="text-lg font-bold text-emerald-400">{compareData.optimal.total_urgency_weighted_coverage.toFixed(1)}</span>
                </div>
                <div>
                  <span className="block text-slate-400 text-[10px] uppercase font-bold">Runtime</span>
                  <span className="text-lg font-bold text-slate-300">{compareData.optimal.runtime_ms.toFixed(2)}ms</span>
                </div>
              </div>
            </div>
          </div>
          <div className="text-[10px] font-sans text-slate-400 italic">
            * Hungarian algorithm calculates the global utility maximum to prevent local greedy bottlenecks (e.g. assigning a specialized volunteer to a generic task).
          </div>
        </div>
      )}

      {/* Control panel & options */}
      <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-xl glass shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-brand-500" />
            <div>
              <h4 className="font-semibold text-slate-200 text-sm">Pluggable Engine Execution</h4>
              <p className="text-xs text-slate-400">Trigger matching models and view proposed pending assignments.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg text-xs p-2 text-slate-200 font-medium focus:outline-none"
            >
              <option value="greedy">Greedy Strategy</option>
              <option value="optimal">Optimal (Hungarian)</option>
            </select>

            <button
              onClick={runMatching}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-slate-950 font-bold px-4 py-2 bg-brand-500 rounded-lg hover:bg-brand-600 transition-all cursor-pointer shadow-md"
            >
              {loading ? (
                <span className="animate-spin rounded-full h-3 w-3 border-t-2 border-slate-950"></span>
              ) : (
                <Shuffle className="w-3.5 h-3.5" />
              )}
              Run Match
            </button>
          </div>
        </div>

        {/* Proposed Assignments Table */}
        {assignments.length > 0 ? (
          <div className="overflow-x-auto border border-slate-700/60 rounded-lg bg-slate-900/40">
            <table className="min-w-full divide-y divide-slate-800 text-left text-xs font-sans">
              <thead className="bg-slate-900 text-slate-400 font-mono text-[10px] uppercase">
                <tr>
                  <th className="px-4 py-2">Task ID</th>
                  <th className="px-4 py-2">Vol ID</th>
                  <th className="px-4 py-2">Score</th>
                  <th className="px-4 py-2">Explanation Reasoning</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200">
                {assignments.map((asg) => (
                  <tr key={asg.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-mono">{asg.task_id}</td>
                    <td className="px-4 py-3 font-mono">{asg.volunteer_id}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-brand-400">{asg.match_score.toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-300 max-w-xs truncate" title={asg.match_reasoning}>
                      {asg.match_reasoning}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleConfirm(asg.id)}
                        disabled={actioningId !== null}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-green-400 border border-green-500/20 bg-green-500/10 px-2 py-1 rounded hover:bg-green-500/20 transition-all cursor-pointer"
                      >
                        {actioningId === asg.id ? (
                          <span className="animate-spin rounded-full h-2 w-2 border-t border-green-400"></span>
                        ) : (
                          <CheckCircle className="w-3 h-3" />
                        )}
                        Confirm
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 bg-slate-900/20 border border-dashed border-slate-700/60 rounded-xl">
            No active proposed assignments. Run the matching algorithm above.
          </div>
        )}
      </div>
    </div>
  );
}
