import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Check, X, ShieldAlert, Navigation, Calendar, Award, Compass } from 'lucide-react';

export default function VolunteerDashboard() {
  const { authFetch, username } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      // For demo, load all assignments (normally filter by logged-in volunteer id/username)
      const res = await authFetch('http://127.0.0.1:8000/api/matching/proposed');
      if (res.ok) {
        const data = await res.json();
        setAssignments(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleAccept = async (id) => {
    setActioningId(id);
    try {
      const res = await authFetch(`http://127.0.0.1:8000/api/matching/confirm/${id}`, {
        method: 'POST'
      });
      if (res.ok) {
        fetchAssignments();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActioningId(null);
    }
  };

  const handleDecline = async (id) => {
    setActioningId(id);
    try {
      const res = await authFetch(`http://127.0.0.1:8000/api/matching/decline/${id}`, {
        method: 'POST'
      });
      if (res.ok) {
        fetchAssignments();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActioningId(null);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    setActioningId(id);
    try {
      const res = await authFetch(`http://127.0.0.1:8000/api/matching/status/${id}?task_status=${newStatus}`, {
        method: 'POST'
      });
      if (res.ok) {
        fetchAssignments();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActioningId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-slate-400">
        <span className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-500 mb-2"></span>
        Loading volunteer assignments...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-6">
      {/* Welcome header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-brand-600/30 to-brand-900/10 p-6 rounded-xl border border-brand-500/20 glass">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Compass className="text-brand-400 w-6 h-6 animate-pulse" /> Welcome back, {username}!
          </h2>
          <p className="text-xs text-slate-300 mt-1">Review your active match proposals, accept or decline assignments, and track task progression status.</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-md font-semibold text-slate-300 border-b border-slate-800 pb-2">Your Task Match Requests</h3>

        {assignments.length > 0 ? (
          <div className="space-y-4">
            {assignments.map((asg) => {
              const isPending = asg.status === 'pending';
              const isAccepted = asg.status === 'accepted';
              const isDeclined = asg.status === 'declined';

              return (
                <div key={asg.id} className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-xl glass shadow-md flex flex-col md:flex-row gap-5 items-start justify-between">
                  
                  {/* Task details and match reasoning */}
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-mono">Assignment ID: {asg.id}</span>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                        isPending ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        isAccepted ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {asg.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-semibold text-slate-200 text-sm">Assigned Task (ID: {asg.task_id})</h4>
                      <p className="text-xs text-slate-400">Volunteer ID matched: {asg.volunteer_id}</p>
                    </div>

                    {/* Explanatory match reasoning */}
                    <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5" /> Match Score Explanation: {asg.match_score.toFixed(1)}/10
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">{asg.match_reasoning}</p>
                    </div>
                  </div>

                  {/* Actions & Progression Tracker */}
                  <div className="w-full md:w-auto flex flex-col items-stretch md:items-end gap-3 self-center">
                    
                    {/* Proposal Actions */}
                    {isPending && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDecline(asg.id)}
                          disabled={actioningId !== null}
                          className="flex items-center justify-center gap-1 text-xs text-red-400 font-semibold px-3 py-2 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 cursor-pointer transition-all"
                        >
                          <X className="w-4 h-4" /> Decline
                        </button>
                        <button
                          onClick={() => handleAccept(asg.id)}
                          disabled={actioningId !== null}
                          className="flex items-center justify-center gap-1 text-xs text-emerald-400 font-semibold px-4 py-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 cursor-pointer transition-all"
                        >
                          <Check className="w-4 h-4" /> Accept
                        </button>
                      </div>
                    )}

                    {/* Progression Tracking buttons */}
                    {isAccepted && (
                      <div className="flex flex-col gap-2 w-full">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider text-center md:text-right font-mono font-bold block">
                          Progression Status Action:
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleUpdateStatus(asg.id, 'in_progress')}
                            disabled={actioningId !== null}
                            className="text-[10px] text-brand-400 border border-brand-500/20 bg-brand-500/10 hover:bg-brand-500/20 font-bold py-1.5 px-3 rounded cursor-pointer transition-all"
                          >
                            Mark In Progress
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(asg.id, 'completed')}
                            disabled={actioningId !== null}
                            className="text-[10px] text-green-400 border border-green-500/20 bg-green-500/10 hover:bg-green-500/20 font-bold py-1.5 px-3 rounded cursor-pointer transition-all"
                          >
                            Mark Completed
                          </button>
                        </div>
                      </div>
                    )}

                    {isDeclined && (
                      <span className="text-xs text-slate-500 italic block text-center md:text-right">
                        Declined. This task has been returned to the match pool.
                      </span>
                    )}

                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500 bg-slate-800/20 border border-dashed border-slate-700/60 rounded-xl">
            No proposed or active matching assignments found.
          </div>
        )}
      </div>
    </div>
  );
}
