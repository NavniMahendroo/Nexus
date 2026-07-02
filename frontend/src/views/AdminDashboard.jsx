import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import TaskMap from '../components/TaskMap';
import UrgencyBreakdown from '../components/UrgencyBreakdown';
import DuplicateReview from '../components/DuplicateReview';
import MatchingPanel from '../components/MatchingPanel';
import RawReportsPanel from '../components/RawReportsPanel';
import { Layers, ShieldAlert, GitPullRequest, AlertCircle, RefreshCw, BarChart2, Compass, LayoutGrid, Zap, ClipboardList } from 'lucide-react';

export default function AdminDashboard() {
  const { authFetch } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedTaskBreakdown, setSelectedTaskBreakdown] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [activeTab, setActiveTab] = useState('map'); // 'map', 'duplicates', 'matching'
  const [recomputing, setRecomputing] = useState(false);

  // Organization filter states
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');

  const fetchOrganizations = async () => {
    try {
      const res = await authFetch('http://127.0.0.1:8000/api/organizations/');
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTasks = async () => {
    setLoadingTasks(true);
    try {
      const url = selectedOrgId 
        ? `http://127.0.0.1:8000/api/tasks/?organization_id=${selectedOrgId}`
        : 'http://127.0.0.1:8000/api/tasks/';
      const res = await authFetch(url);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTasks(false);
    }
  };

  const fetchUrgencyBreakdown = async (taskId) => {
    try {
      const res = await authFetch(`http://127.0.0.1:8000/api/tasks/${taskId}/urgency-breakdown`);
      if (res.ok) {
        const data = await res.json();
        setSelectedTaskBreakdown(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectTask = (task) => {
    setSelectedTask(task);
    fetchUrgencyBreakdown(task.id);
  };

  const handleTriggerRecompute = async () => {
    setRecomputing(true);
    try {
      const res = await authFetch('http://127.0.0.1:8000/api/tasks/recompute-urgency', {
        method: 'POST'
      });
      if (res.ok) {
        fetchTasks();
        setSelectedTask(null);
        setSelectedTaskBreakdown(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRecomputing(false);
    }
  };

  // Re-fetch tasks when the organization filter changes
  useEffect(() => {
    fetchTasks();
  }, [selectedOrgId]);

  useEffect(() => {
    fetchTasks();
    fetchOrganizations();
  }, []);

  return (
    <div className="space-y-8 p-4 sm:p-8 max-w-7xl mx-auto animate-fadeIn">
      {/* Dashboard Top Header Control Panel */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-slate-800 pb-5">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[10px] font-bold uppercase tracking-wider">
            <LayoutGrid className="w-3.5 h-3.5" /> Incident Management Room
          </div>
          <h2 className="text-3xl font-black tracking-tight text-slate-100 flex items-center gap-2">
            NGO Command & Operations Console
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed max-w-3xl font-medium">
            Ingest incident reports, resolve geospatial duplicates, review natural language urgency breakdowns, and trigger optimal matching algorithms.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3.5 shrink-0 w-full md:w-auto">
          {/* Organization Dropdown Filter */}
          <select
            value={selectedOrgId}
            onChange={(e) => setSelectedOrgId(e.target.value)}
            className="bg-slate-950 border border-slate-850 rounded-xl text-xs py-3.5 px-4 text-slate-300 font-semibold focus:outline-none input-premium cursor-pointer w-full md:w-56"
          >
            <option value="">All Organizations</option>
            {organizations.map(org => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>

          <button
            onClick={handleTriggerRecompute}
            disabled={recomputing}
            className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-100 border border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-700 py-3.5 px-5 rounded-xl cursor-pointer active:scale-95 transition-all shadow-lg hover-card w-full md:w-auto"
          >
            <RefreshCw className={`w-4 h-4 text-sky-400 ${recomputing ? 'animate-spin' : ''}`} />
            {recomputing ? 'Recomputing Parameters...' : 'Recompute Urgency'}
          </button>
        </div>
      </div>

      {/* Main Tab Controller navigation */}
      <div className="flex bg-slate-950 p-1.5 rounded-2xl w-full sm:w-max border border-slate-850 shadow-inner">
        <button
          onClick={() => setActiveTab('map')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2.5 px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'map' 
              ? 'tab-pill-active font-black' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <Layers className="w-4 h-4" /> Live Map & Urgency
        </button>
        <button
          onClick={() => setActiveTab('duplicates')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2.5 px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'duplicates' 
              ? 'tab-pill-active font-black' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <ShieldAlert className="w-4 h-4" /> Duplicate Review
        </button>
        <button
          onClick={() => setActiveTab('matching')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2.5 px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'matching' 
              ? 'tab-pill-active font-black' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <GitPullRequest className="w-4 h-4" /> Pluggable Matching
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2.5 px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'reports' 
              ? 'tab-pill-active font-black' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <ClipboardList className="w-4 h-4" /> Need Reports
        </button>
      </div>

      {/* Content views switcher */}
      {activeTab === 'map' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Map Grid container */}
          <div className="lg:col-span-2 space-y-5 w-full">
            <div className="flex justify-between items-center bg-slate-950/60 p-4 rounded-xl border border-slate-900 shadow-inner">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Compass className="w-4 h-4 text-sky-400 animate-spin-slow" /> Geospatial Placement Coordinates
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={showHeatmap} 
                  onChange={(e) => setShowHeatmap(e.target.checked)} 
                  className="sr-only peer" 
                />
                <div className="w-9 h-5 bg-slate-900 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500 peer-checked:after:bg-slate-950"></div>
                <span className="ml-2.5 text-xs text-slate-400 font-bold select-none cursor-pointer">Density Heatmap</span>
              </label>
            </div>

            {loadingTasks ? (
              <div className="flex flex-col items-center justify-center bg-slate-950/20 border border-slate-850 h-[500px] rounded-2xl text-slate-400 glass-card glow-deck">
                <span className="animate-spin rounded-full h-9 w-9 border-t-2 border-sky-400 mb-3"></span>
                <span className="text-xs font-semibold tracking-wide text-slate-300">Plotting coordinates...</span>
              </div>
            ) : tasks.length > 0 ? (
              <div className="overflow-hidden rounded-2xl border border-slate-800 shadow-2xl shadow-slate-950/50 glow-deck map-pulse">
                <TaskMap 
                  tasks={tasks} 
                  selectedTaskId={selectedTask?.id} 
                  onSelectTask={handleSelectTask} 
                  showHeatmap={showHeatmap} 
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center bg-slate-950/25 border border-dashed border-slate-850 h-[500px] rounded-2xl text-slate-500 glass-card">
                <AlertCircle className="w-12 h-12 mb-3 text-slate-700 animate-pulse" />
                <span className="text-sm font-bold text-slate-400">No active incidents found in database</span>
                <span className="text-xs text-slate-500 mt-1">Ingest raw reports using Swagger or CSV uploaders.</span>
              </div>
            )}
          </div>

          {/* Details & Urgency breakdown column */}
          <div className="space-y-4 w-full">
            <UrgencyBreakdown breakdown={selectedTaskBreakdown} />
          </div>
        </div>
      )}

      {activeTab === 'duplicates' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-sky-400" /> Pending Ingestion Deduplication Review
            </h3>
            <p className="text-xs text-slate-500 mt-1">Review duplicates flagged by Sentence Transformer embeddings using cosine similarity indexes.</p>
          </div>
          <DuplicateReview />
        </div>
      )}

      {activeTab === 'matching' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-sky-400" /> Pluggable Matching Models & Strategy benchmarking
            </h3>
            <p className="text-xs text-slate-500 mt-1">Benchmark and analyze the Greedy allocator against the globally optimal Hungarian solver.</p>
          </div>
          <MatchingPanel />
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-sky-400" /> Raw Reports Ingestion Panel
            </h3>
            <p className="text-xs text-slate-500 mt-1">Ingest raw disaster needs and review non-duplicate reports awaiting conversion to active tasks.</p>
          </div>
          <RawReportsPanel onTaskCreated={fetchTasks} filterOrgId={selectedOrgId} />
        </div>
      )}
    </div>
  );
}
