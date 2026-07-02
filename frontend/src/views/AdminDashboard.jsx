import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import TaskMap from '../components/TaskMap';
import UrgencyBreakdown from '../components/UrgencyBreakdown';
import DuplicateReview from '../components/DuplicateReview';
import MatchingPanel from '../components/MatchingPanel';
import { Layers, ShieldAlert, GitPullRequest, AlertCircle, RefreshCw, BarChart2, Compass, LayoutGrid } from 'lucide-react';

export default function AdminDashboard() {
  const { authFetch } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedTaskBreakdown, setSelectedTaskBreakdown] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [activeTab, setActiveTab] = useState('map'); // 'map', 'duplicates', 'matching'
  const [recomputing, setRecomputing] = useState(false);

  const fetchTasks = async () => {
    setLoadingTasks(true);
    try {
      const res = await authFetch('http://127.0.0.1:8000/api/tasks/');
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

  useEffect(() => {
    fetchTasks();
  }, []);

  return (
    <div className="space-y-8 p-4 sm:p-8 max-w-7xl mx-auto animate-fadeIn">
      {/* Upper Dashboard Header with premium alignment */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-slate-800 pb-5">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[10px] font-bold uppercase tracking-wider">
            <LayoutGrid className="w-3.5 h-3.5" /> Operations Console
          </div>
          <h2 className="text-2xl font-black tracking-wide text-slate-100 flex items-center gap-2">
            NGO Command & Control Dashboard
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
            Monitor disaster events geolocated on the live map, inspect natural language urgency weight criteria calculations, verify duplicate candidates, and assign volunteers using Greedy vs Hungarian strategies.
          </p>
        </div>

        <button
          onClick={handleTriggerRecompute}
          disabled={recomputing}
          className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-200 border border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-700 py-2.5 px-4.5 rounded-xl cursor-pointer active:scale-95 transition-all shadow-md shadow-brand-500/5 hover-card shrink-0"
        >
          <RefreshCw className={`w-4 h-4 text-brand-400 ${recomputing ? 'animate-spin' : ''}`} />
          {recomputing ? 'Recomputing Urgency...' : 'Recompute Urgency'}
        </button>
      </div>

      {/* Main Tab Segmented Navigation Control */}
      <div className="flex bg-slate-950/80 p-1.5 rounded-2xl w-full sm:w-max border border-slate-800/80 shadow-inner">
        <button
          onClick={() => setActiveTab('map')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'map' 
              ? 'tab-active text-slate-950 font-black' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <Layers className="w-4 h-4" /> Live Map & Details
        </button>
        <button
          onClick={() => setActiveTab('duplicates')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'duplicates' 
              ? 'tab-active text-slate-950 font-black' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <ShieldAlert className="w-4 h-4" /> Duplicate Review
        </button>
        <button
          onClick={() => setActiveTab('matching')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'matching' 
              ? 'tab-active text-slate-950 font-black' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <GitPullRequest className="w-4 h-4" /> Pluggable Matching
        </button>
      </div>

      {/* Main Content Area */}
      {activeTab === 'map' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Map and Toggle Panel */}
          <div className="lg:col-span-2 space-y-5 w-full">
            <div className="flex justify-between items-center bg-slate-950/60 p-4 rounded-xl border border-slate-900">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-brand-400 animate-spin-slow" /> Geospatial Placement & Coverage
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={showHeatmap} 
                  onChange={(e) => setShowHeatmap(e.target.checked)} 
                  className="sr-only peer" 
                />
                <div className="w-9 h-5 bg-slate-900 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500 peer-checked:after:bg-slate-950"></div>
                <span className="ml-2.5 text-xs text-slate-400 font-bold select-none cursor-pointer">Heatmap Density</span>
              </label>
            </div>

            {loadingTasks ? (
              <div className="flex flex-col items-center justify-center bg-slate-900/20 border border-slate-800/80 h-[480px] rounded-2xl text-slate-400 glass glow-brand-sm">
                <span className="animate-spin rounded-full h-9 w-9 border-t-2 border-brand-500 mb-3"></span>
                <span className="text-xs font-semibold tracking-wide">Plotting active coordinates...</span>
              </div>
            ) : tasks.length > 0 ? (
              <div className="overflow-hidden rounded-2xl border border-slate-800 shadow-xl shadow-slate-950/50">
                <TaskMap 
                  tasks={tasks} 
                  selectedTaskId={selectedTask?.id} 
                  onSelectTask={handleSelectTask} 
                  showHeatmap={showHeatmap} 
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center bg-slate-900/20 border border-dashed border-slate-850 h-[480px] rounded-2xl text-slate-500 glass">
                <AlertCircle className="w-12 h-12 mb-3 text-slate-700 animate-pulse" />
                <span className="text-sm font-bold text-slate-400">No active tasks found in the database</span>
                <span className="text-xs text-slate-500 mt-1">Submit field reports to trigger ingestion pipelines.</span>
              </div>
            )}
          </div>

          {/* Sidebar Urgency Score Card */}
          <div className="space-y-4 w-full">
            <UrgencyBreakdown breakdown={selectedTaskBreakdown} />
          </div>
        </div>
      )}

      {activeTab === 'duplicates' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">
              Pending Duplicate Review Panel
            </h3>
            <p className="text-xs text-slate-500 mt-1">Resolve spatial and semantic report duplicates flagged by sentence embedding analysis models.</p>
          </div>
          <DuplicateReview />
        </div>
      )}

      {activeTab === 'matching' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">
              Pluggable Engine Execution & Benchmarking
            </h3>
            <p className="text-xs text-slate-500 mt-1">Benchmark Greedy and Optimal (Hungarian) algorithm coverage, run matches, and review assignments.</p>
          </div>
          <MatchingPanel />
        </div>
      )}
    </div>
  );
}
