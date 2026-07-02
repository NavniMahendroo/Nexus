import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Check, X, ShieldAlert, Navigation, Calendar, Award, Compass, Sparkles, User, Briefcase, Activity } from 'lucide-react';

export default function VolunteerDashboard() {
  const { authFetch, username } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
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
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
        <span className="animate-spin rounded-full h-9 w-9 border-t-2 border-brand-500 mb-3"></span>
        <span className="text-sm font-semibold tracking-wide">Loading assignment dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto p-4 sm:p-8 animate-fadeIn">
      {/* Welcome header with dynamic gradient glow */}
      <div className="relative overflow-hidden bg-slate-900/40 p-8 rounded-2xl border border-brand-500/10 glass glow-brand flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[10px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3 animate-spin-slow" /> Volunteer Workspace
          </div>
          <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2.5">
            Welcome back, {username}!
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Here are your active match proposals and assigned field rescue operations. Accept pending assignments to coordinate efforts and track disaster resolution progress.
          </p>
        </div>
        <div className="hidden md:flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/5 border border-brand-500/15 text-brand-400 shadow-lg">
          <User className="w-8 h-8" />
        </div>
      </div>

      {/* Assignments Queue */}
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-brand-500" /> Active Operations & Requests
          </h3>
          <span className="text-xs font-bold text-slate-500 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
            {assignments.length} Total
          </span>
        </div>

        {assignments.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {assignments.map((asg) => {
              const isPending = asg.status === 'pending';
              const isAccepted = asg.status === 'accepted';
              const isDeclined = asg.status === 'declined';

              return (
                <div 
                  key={asg.id} 
                  className="bg-slate-900/30 border border-slate-800/80 p-6 rounded-2xl glass hover-card flex flex-col md:flex-row gap-6 items-start justify-between"
                >
                  {/* Task details and match reasoning */}
                  <div className="space-y-4 flex-1 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] text-slate-500 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-mono">
                        OP ID: {asg.id}
                      </span>
                      <span className={`text-[9px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full border ${
                        isPending ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-sm shadow-amber-500/5' :
                        isAccepted ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-sm shadow-emerald-500/5' :
                        'bg-red-500/10 text-red-400 border-red-500/20 shadow-sm shadow-red-500/5'
                      }`}>
                        {asg.status}
                      </span>
                      {isAccepted && asg.task_status && (
                        <span className={`text-[9px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                          asg.task_status === 'in_progress' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse' :
                          asg.task_status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                          'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                        }`}>
                          <Activity className="w-3 h-3" /> Task: {asg.task_status.replace('_', ' ')}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-100 text-base">
                        Rescue Operation Task (Task ID: {asg.task_id})
                      </h4>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        Assigned Volunteer ID: <span className="font-semibold text-slate-300">{asg.volunteer_id}</span>
                      </p>
                    </div>

                    {/* Explanatory match reasoning card */}
                    <div className="bg-slate-950/60 p-4.5 rounded-xl border border-slate-800/80 space-y-2.5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-brand-400 flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-brand-500" /> Match Quality: {asg.match_score.toFixed(1)} / 1.0 Utility
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans font-medium">
                        {asg.match_reasoning}
                      </p>
                    </div>
                  </div>

                  {/* Actions & Progression Tracker Panel */}
                  <div className="w-full md:w-auto flex flex-col items-stretch md:items-end justify-center gap-3.5 self-stretch border-t md:border-t-0 border-slate-800/80 pt-4 md:pt-0 shrink-0">
                    
                    {/* Proposal Actions */}
                    {isPending && (
                      <div className="flex gap-2.5 w-full">
                        <button
                          onClick={() => handleDecline(asg.id)}
                          disabled={actioningId !== null}
                          className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 text-xs text-red-400 font-bold px-4 py-2.5 rounded-xl border border-red-500/15 bg-red-500/5 hover:bg-red-500/10 cursor-pointer active:scale-95 transition-all shadow-sm shadow-red-500/5"
                        >
                          <X className="w-4 h-4" /> Decline
                        </button>
                        <button
                          onClick={() => handleAccept(asg.id)}
                          disabled={actioningId !== null}
                          className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 text-xs text-slate-900 bg-brand-500 hover:bg-brand-600 font-bold px-5 py-2.5 rounded-xl cursor-pointer active:scale-95 transition-all shadow-md shadow-brand-500/10"
                        >
                          <Check className="w-4 h-4 text-slate-950" /> Accept Match
                        </button>
                      </div>
                    )}

                    {/* Progression Tracking buttons */}
                    {isAccepted && (
                      <div className="flex flex-col gap-2.5 w-full">
                        <span className="text-[9px] text-slate-500 uppercase tracking-widest text-center md:text-right font-black block">
                          Progression Actions
                        </span>
                        <div className="grid grid-cols-2 gap-2.5 w-full md:w-60">
                          <button
                            onClick={() => handleUpdateStatus(asg.id, 'in_progress')}
                            disabled={actioningId !== null || asg.task_status === 'in_progress' || asg.task_status === 'completed'}
                            className={`text-[10px] font-bold py-2.5 px-3.5 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                              asg.task_status === 'in_progress' 
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/30 cursor-default active:scale-100'
                                : asg.task_status === 'completed'
                                ? 'bg-slate-950 text-slate-700 border-slate-900 cursor-not-allowed active:scale-100'
                                : 'text-brand-400 border-brand-500/25 bg-brand-500/5 hover:bg-brand-500/10'
                            }`}
                          >
                            {asg.task_status === 'in_progress' ? 'In Progress' : 'Start Task'}
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(asg.id, 'completed')}
                            disabled={actioningId !== null || asg.task_status === 'completed'}
                            className={`text-[10px] font-bold py-2.5 px-3.5 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                              asg.task_status === 'completed'
                                ? 'bg-green-500/20 text-green-300 border-green-500/30 cursor-default active:scale-100'
                                : 'text-green-400 border-green-500/25 bg-green-500/5 hover:bg-green-500/10'
                            }`}
                          >
                            {asg.task_status === 'completed' ? 'Completed' : 'Resolve Task'}
                          </button>
                        </div>
                      </div>
                    )}

                    {isDeclined && (
                      <div className="bg-red-500/5 border border-red-500/10 p-3 rounded-xl flex items-center gap-2 max-w-xs">
                        <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                        <span className="text-[10px] text-red-300 leading-normal font-semibold">
                          Declined. This operation has been returned to the queue.
                        </span>
                      </div>
                    )}

                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-16 text-center text-slate-500 bg-slate-900/10 border border-dashed border-slate-800/80 rounded-2xl glass">
            <Compass className="w-10 h-10 mx-auto text-slate-700 mb-3 animate-spin-slow" />
            <p className="text-sm font-semibold text-slate-400">No operations currently assigned</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">When the NGO command center matches a disaster task to your profile, it will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
