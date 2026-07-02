import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Check, X, ShieldAlert, Navigation, Calendar, Award, Compass, Sparkles, User, Briefcase, Activity, Inbox, FolderCheck, Archive, Zap, Settings } from 'lucide-react';

const AVATAR_OPTIONS = [
  { id: 'adventurer', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&mouth=smile' },
  { id: 'bottts', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Aneka' },
  { id: 'avataaars', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack' },
  { id: 'lorelei', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Sassy' },
  { id: 'personas', url: 'https://api.dicebear.com/7.x/personas/svg?seed=Boots' },
  { id: 'miniavs', url: 'https://api.dicebear.com/7.x/miniavs/svg?seed=Nala' }
];

const AvatarImage = ({ src, alt, className, fallbackSize = 6 }) => {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [src]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900/60 rounded-xl text-slate-500">
        <User className={`w-${fallbackSize} h-${fallbackSize}`} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setError(true)}
      className={className}
    />
  );
};

export default function VolunteerDashboard() {
  const { authFetch, username, organizationId } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('pending'); // 'pending', 'active', 'completed'
  const [showSettings, setShowSettings] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(
    localStorage.getItem(`volunteer_avatar_${username}`) || AVATAR_OPTIONS[0].url
  );

  const handleSelectAvatar = (url) => {
    setSelectedAvatar(url);
    localStorage.setItem(`volunteer_avatar_${username}`, url);
  };

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
        await fetchAssignments();
        setActiveSubTab('active');
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
        await fetchAssignments();
        if (newStatus === 'completed') {
          setActiveSubTab('completed');
        }
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
        <span className="animate-spin rounded-full h-9 w-9 border-t-2 border-sky-400 mb-3"></span>
        <span className="text-sm font-semibold tracking-wide text-slate-300">Loading operational workspace...</span>
      </div>
    );
  }

  const pendingList = assignments.filter(asg => asg.status === 'pending');
  const activeList = assignments.filter(asg => asg.status === 'accepted' && asg.task_status !== 'completed');
  const completedList = assignments.filter(asg => asg.status === 'accepted' && asg.task_status === 'completed');

  const currentDisplayList = 
    activeSubTab === 'pending' ? pendingList : 
    activeSubTab === 'active' ? activeList : completedList;

  return (
    <div className="space-y-8 max-w-5xl mx-auto p-4 sm:p-8 animate-fadeIn">
      {/* Welcome Banner Card */}
      <div className="relative overflow-hidden bg-slate-950/40 p-8 rounded-2xl border border-sky-500/10 glass-card glow-deck flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="absolute top-[-20%] right-[-10%] w-[350px] h-[350px] rounded-full bg-sky-500/5 blur-[90px] pointer-events-none"></div>
        <div className="space-y-2.5 z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[10px] font-bold uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 text-sky-400 animate-pulse" /> Volunteer Response Workspace
          </div>
          <h2 className="text-3xl font-black text-slate-100 flex items-center gap-3">
            Welcome back, {username}!
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed font-medium">
            Review proposed assignments, coordinate active missions, and update task statuses to ensure seamless field logistics.
          </p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="h-16 w-16 relative flex items-center justify-center rounded-2xl bg-slate-950 border border-sky-500/15 hover:border-sky-400/50 hover:bg-sky-500/10 text-sky-400 shadow-xl shadow-slate-950 hover:scale-105 transition-all cursor-pointer overflow-hidden p-1.5 shrink-0 group"
          title="Profile & Settings"
        >
          <AvatarImage 
            src={selectedAvatar} 
            alt="Profile Avatar"
            className="w-full h-full rounded-xl object-contain group-hover:opacity-40 transition-opacity"
            fallbackSize={6}
          />
          <Settings className="absolute w-6 h-6 text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity rotate-0 group-hover:rotate-45 duration-300 pointer-events-none" />
        </button>
      </div>

      {/* Segmented Sub-Tab Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-850 shadow-inner w-full sm:w-max">
          <button
            onClick={() => setActiveSubTab('pending')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeSubTab === 'pending'
                ? 'tab-pill-active text-slate-100'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/35'
            }`}
          >
            <Inbox className="w-4 h-4" /> Proposals ({pendingList.length})
          </button>
          <button
            onClick={() => setActiveSubTab('active')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeSubTab === 'active'
                ? 'tab-pill-active text-slate-100'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/35'
            }`}
          >
            <Activity className="w-4 h-4" /> Active Missions ({activeList.length})
          </button>
          <button
            onClick={() => setActiveSubTab('completed')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeSubTab === 'completed'
                ? 'tab-pill-active text-slate-100'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/35'
            }`}
          >
            <FolderCheck className="w-4 h-4" /> Completed Archive ({completedList.length})
          </button>
        </div>

        <span className="text-xs font-mono font-bold text-slate-500 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-900 self-end sm:self-center">
          Operational Queue: {assignments.length} assignments
        </span>
      </div>

      {/* Assignments List Area */}
      <div className="space-y-4">
        {currentDisplayList.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {currentDisplayList.map((asg) => {
              const isPending = asg.status === 'pending';
              const isAccepted = asg.status === 'accepted';
              const isDeclined = asg.status === 'declined';

              // Determine border accent style
              const accentClass = 
                asg.task_status === 'completed' ? 'accent-border-low glow-card-low' :
                asg.task_status === 'in_progress' ? 'accent-border-medium glow-card-medium' :
                isPending ? 'accent-border-high glow-card-high' : 'accent-border-medium';

              return (
                <div 
                  key={asg.id} 
                  className={`glass-card p-6 rounded-2xl overflow-hidden interactive-card-hover flex flex-col md:flex-row gap-6 items-start justify-between ${accentClass}`}
                >
                  {/* Task details and match reasoning */}
                  <div className="space-y-4.5 flex-1 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-bold bg-slate-950 px-2.5 py-0.5 rounded border border-slate-900 font-mono">
                        OP ID: #{asg.id}
                      </span>
                      <span className={`text-[9px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full border ${
                        isPending ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        isAccepted ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {asg.status}
                      </span>
                      {isAccepted && asg.task_status && (
                        <span className={`text-[9px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                          asg.task_status === 'in_progress' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20 animate-pulse' :
                          asg.task_status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                        }`}>
                          <Activity className="w-3.5 h-3.5" /> Task: {asg.task_status.replace('_', ' ')}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="font-extrabold text-slate-100 text-lg leading-tight">
                        Disaster Rescue Task (Task ID: #{asg.task_id})
                      </h4>
                      <p className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                        Assigned Volunteer ID: <span className="font-bold text-slate-200 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-900 font-mono">#{asg.volunteer_id}</span>
                      </p>
                    </div>

                    {/* Explanatory match reasoning card */}
                    <div className="bg-slate-950/60 p-4.5 rounded-xl border border-slate-900 space-y-2.5 shadow-inner">
                      <span className="text-[9px] font-black uppercase tracking-widest text-sky-400 flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-sky-400" /> Match Score: {asg.match_score.toFixed(1)} / 1.0 Quality
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans font-medium">
                        {asg.match_reasoning}
                      </p>
                    </div>
                  </div>

                  {/* Actions Panel */}
                  <div className="w-full md:w-auto flex flex-col items-stretch md:items-end justify-center gap-4 self-stretch border-t md:border-t-0 border-slate-850 pt-4 md:pt-0 shrink-0">
                    
                    {/* Proposal Actions */}
                    {isPending && (
                      <div className="flex gap-2.5 w-full">
                        <button
                          onClick={() => handleDecline(asg.id)}
                          disabled={actioningId !== null}
                          className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 text-xs text-red-400 font-bold px-4.5 py-2.5 rounded-xl border border-red-500/15 bg-red-500/5 hover:bg-red-500/10 cursor-pointer active:scale-95 transition-all shadow-sm"
                        >
                          <X className="w-4 h-4" /> Decline
                        </button>
                        <button
                          onClick={() => handleAccept(asg.id)}
                          disabled={actioningId !== null}
                          className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 text-xs text-slate-950 bg-gradient-to-r from-sky-500 to-sky-600 hover:brightness-110 font-bold px-5 py-2.5 rounded-xl cursor-pointer active:scale-95 transition-all shadow-md"
                        >
                          <Check className="w-4 h-4 text-slate-950" /> Accept Mission
                        </button>
                      </div>
                    )}

                    {/* Progression Tracking buttons */}
                    {isAccepted && asg.task_status !== 'completed' && (
                      <div className="flex flex-col gap-2.5 w-full">
                        <span className="text-[9px] text-slate-500 uppercase tracking-widest text-center md:text-right font-black block">
                          Progression Control
                        </span>
                        <div className="grid grid-cols-2 gap-2.5 w-full md:w-64">
                          <button
                            onClick={() => handleUpdateStatus(asg.id, 'in_progress')}
                            disabled={actioningId !== null || asg.task_status === 'in_progress'}
                            className={`text-[10px] font-black py-3 px-4 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                              asg.task_status === 'in_progress' 
                                ? 'bg-sky-500/20 text-sky-300 border-sky-500/30 cursor-default active:scale-100 shadow-inner shadow-sky-500/10'
                                : 'text-sky-400 border-sky-500/25 bg-sky-500/5 hover:bg-sky-500/10 hover:border-sky-500/40 shadow'
                            }`}
                          >
                            {asg.task_status === 'in_progress' ? 'In Progress' : 'Start Task'}
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(asg.id, 'completed')}
                            disabled={actioningId !== null}
                            className="text-[10px] text-emerald-400 border border-emerald-500/25 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/40 font-black py-3 px-4 rounded-xl cursor-pointer active:scale-95 transition-all shadow"
                          >
                            Resolve Task
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Completed View Indicator */}
                    {asg.task_status === 'completed' && (
                      <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-xl flex items-center gap-2 max-w-xs md:text-right shadow-inner shadow-emerald-500/5">
                        <FolderCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                        <span className="text-[10px] text-emerald-300 font-bold leading-normal">
                          Mission Accomplished & Operation Logged.
                        </span>
                      </div>
                    )}

                    {isDeclined && (
                      <div className="bg-red-500/5 border border-red-500/10 p-3.5 rounded-xl flex items-center gap-2 max-w-xs">
                        <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                        <span className="text-[10px] text-red-300 leading-normal font-semibold">
                          Declined. Returned to matching pool.
                        </span>
                      </div>
                    )}

                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-16 text-center text-slate-500 bg-slate-950/20 border border-dashed border-slate-850 rounded-2xl glass-card">
            <Archive className="w-10 h-10 mx-auto text-slate-700 mb-3 animate-spin-slow" />
            <p className="text-sm font-bold text-slate-400">
              {activeSubTab === 'pending' && 'No pending proposals found'}
              {activeSubTab === 'active' && 'No active operations in progress'}
              {activeSubTab === 'completed' && 'No completed operations archive'}
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-normal">
              {activeSubTab === 'pending' && 'Incoming operation pairings will pop up here for confirmation.'}
              {activeSubTab === 'active' && 'Accept pending proposals to begin tracking status changes.'}
              {activeSubTab === 'completed' && 'Operations you complete and resolve will be logged here.'}
            </p>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-6 shadow-2xl relative animate-slideUp">
            
            <button 
              onClick={() => setShowSettings(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center space-y-3.5 border-b border-slate-850 pb-5">
              <div className="w-20 h-20 rounded-full border-2 border-brand-500 shadow-lg bg-slate-950 p-1 overflow-hidden flex items-center justify-center">
                <AvatarImage 
                  src={selectedAvatar} 
                  alt="Profile Avatar"
                  className="w-full h-full rounded-full object-contain"
                  fallbackSize={8}
                />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-black text-slate-100">{username}</h3>
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">nexus volunteer profile</span>
              </div>
            </div>

            {/* Avatar Selector Options */}
            <div className="space-y-2 border-b border-slate-850 pb-5">
              <span className="text-[9px] text-slate-500 uppercase tracking-widest block font-black">Choose your character</span>
              <div className="flex gap-2 justify-center">
                {AVATAR_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectAvatar(opt.url)}
                    className={`w-9 h-9 rounded-xl p-1 bg-slate-950 border transition-all cursor-pointer hover:scale-110 flex items-center justify-center ${
                      selectedAvatar === opt.url 
                        ? 'border-brand-500 ring-2 ring-brand-500/20' 
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <AvatarImage src={opt.url} alt={opt.id} className="w-full h-full object-contain" fallbackSize={4} />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 text-xs font-semibold text-slate-300">
              <div className="flex items-center justify-between py-2.5 border-b border-slate-850">
                <span className="text-slate-500 uppercase tracking-wider text-[9px] font-black">Associated NGO ID</span>
                <span className="px-2.5 py-1 bg-slate-950 text-slate-300 border border-slate-850 rounded-lg">
                  {organizationId || 'None'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-slate-500 uppercase tracking-wider text-[9px] font-black">Platform Role</span>
                <span className="px-2.5 py-1 bg-slate-950 text-sky-400 border border-slate-850 rounded-lg uppercase tracking-wide text-[10px]">
                  Volunteer
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="w-full text-xs font-bold text-slate-950 bg-brand-500 hover:bg-brand-600 rounded-xl py-3 cursor-pointer transition-all active:scale-[0.98]"
            >
              Close Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
