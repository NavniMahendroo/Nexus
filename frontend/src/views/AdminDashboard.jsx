import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import TaskMap from '../components/TaskMap';
import UrgencyBreakdown from '../components/UrgencyBreakdown';
import DuplicateReview from '../components/DuplicateReview';
import MatchingPanel from '../components/MatchingPanel';
import { Layers, ShieldAlert, GitPullRequest, AlertCircle, RefreshCw, BarChart2 } from 'lucide-react';

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
      const res = await authFetch('http://localhost:8000/api/tasks/');
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
      const res = await authFetch(`http://localhost:8000/api/tasks/${taskId}/urgency-breakdown`);
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
      const res = await authFetch('http://localhost:8000/api/tasks/recompute-urgency', {
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
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Upper Dashboard Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-wide text-slate-100 flex items-center gap-2">
            <BarChart2 className="text-brand-500 w-6 h-6" /> NGO Admin Match Dashboard
          </h2>
          <p className="text-xs text-slate-400 mt-1">Manage global disaster tasks, review duplicates, benchmark strategies, and verify geospatial placements.</p>
        </div>

        <button
          onClick={handleTriggerRecompute}
          disabled={recomputing}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 border border-slate-700 bg-slate-800 hover:bg-slate-700 py-2 px-4 rounded-lg cursor-pointer transition-all shadow"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${recomputing ? 'animate-spin' : ''}`} />
          Recompute Urgency
        </button>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex gap-1 bg-slate-950 p-1 rounded-lg w-max border border-slate-800">
        <button
          onClick={() => setActiveTab('map')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${
            activeTab === 'map' ? 'bg-brand-600 text-slate-100' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" /> Map & Details
        </button>
        <button
          onClick={() => setActiveTab('duplicates')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${
            activeTab === 'duplicates' ? 'bg-brand-600 text-slate-100' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4" /> Duplicate Review
        </button>
        <button
          onClick={() => setActiveTab('matching')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${
            activeTab === 'matching' ? 'bg-brand-600 text-slate-100' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <GitPullRequest className="w-4 h-4" /> Pluggable Matching
        </button>
      </div>

      {/* Main Content Area */}
      {activeTab === 'map' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map and Toggle Panel */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center bg-slate-800/40 p-3 rounded-lg border border-slate-800/80">
              <span className="text-xs font-medium text-slate-300">Geospatial Need Distribution Map</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={showHeatmap} 
                  onChange={(e) => setShowHeatmap(e.target.checked)} 
                  className="sr-only peer" 
                />
                <div className="w-9 h-5 bg-slate-900 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500 peer-checked:after:bg-slate-950"></div>
                <span className="ml-2 text-xs text-slate-400 font-semibold select-none">Heatmap Density</span>
              </label>
            </div>

            {loadingTasks ? (
              <div className="flex flex-col items-center justify-center bg-slate-800/30 border border-slate-700 h-[450px] rounded-xl text-slate-400">
                <span className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-500 mb-2"></span>
                Loading geospatial task plots...
              </div>
            ) : tasks.length > 0 ? (
              <TaskMap 
                tasks={tasks} 
                selectedTaskId={selectedTask?.id} 
                onSelectTask={handleSelectTask} 
                showHeatmap={showHeatmap} 
              />
            ) : (
              <div className="flex flex-col items-center justify-center bg-slate-800/30 border border-slate-700 h-[450px] rounded-xl text-slate-500">
                <AlertCircle className="w-10 h-10 mb-2 text-slate-600" />
                No active tasks found in the database.
              </div>
            )}
          </div>

          {/* Sidebar Urgency Score Card */}
          <div className="space-y-4">
            <UrgencyBreakdown breakdown={selectedTaskBreakdown} />
          </div>
        </div>
      )}

      {activeTab === 'duplicates' && (
        <div className="space-y-4">
          <h3 className="text-md font-semibold text-slate-300 border-b border-slate-800 pb-2">Pending Duplicate Review Panel</h3>
          <DuplicateReview />
        </div>
      )}

      {activeTab === 'matching' && (
        <div className="space-y-4">
          <h3 className="text-md font-semibold text-slate-300 border-b border-slate-800 pb-2">Pluggable Engine Execution & Benchmarking</h3>
          <MatchingPanel />
        </div>
      )}
    </div>
  );
}
