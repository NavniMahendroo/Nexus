import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ClipboardList, PlusCircle, CheckCircle, ArrowRight, ShieldAlert, Users, MapPin, Activity } from 'lucide-react';

export default function RawReportsPanel({ onTaskCreated, filterOrgId }) {
  const { authFetch, organizationId } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actioningId, setActioningId] = useState(null);

  // Form states
  const [description, setDescription] = useState('');
  const [rawCategory, setRawCategory] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [populationAffected, setPopulationAffected] = useState(1);
  const [corroborationCount, setCorroborationCount] = useState(1);
  const [latitude, setLatitude] = useState(47.606);
  const [longitude, setLongitude] = useState(-122.333);
  const [reportedById, setReportedById] = useState(1);
  
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Auto-fill reportedById if organizationId exists in AuthContext
  useEffect(() => {
    if (organizationId) {
      setReportedById(organizationId);
    }
  }, [organizationId]);

  const fetchRawReports = async () => {
    setLoading(true);
    try {
      const url = filterOrgId
        ? `http://127.0.0.1:8000/api/reports/?organization_id=${filterOrgId}`
        : 'http://127.0.0.1:8000/api/reports/';
      const res = await authFetch(url);
      if (res.ok) {
        const data = await res.json();
        // Filter for unconverted RAW need reports
        const rawReports = data.filter(r => r.status === 'raw');
        setReports(rawReports);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRawReports();
  }, [filterOrgId]);

  const handleCreateReport = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      const res = await authFetch('http://127.0.0.1:8000/api/reports/', {
        method: 'POST',
        body: JSON.stringify({
          description,
          severity,
          population_affected: parseInt(populationAffected),
          corroboration_count: parseInt(corroborationCount),
          raw_category: rawCategory,
          location: {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude)
          },
          reported_by_id: parseInt(reportedById)
        })
      });

      if (res.ok) {
        setSuccessMessage('Need Report ingested successfully! Embedding generated & duplicates checked.');
        setDescription('');
        setRawCategory('');
        fetchRawReports();
        if (onTaskCreated) onTaskCreated(); // Refresh map in case duplicate reviews popped up
      } else {
        const errData = await res.json();
        setErrorMessage(errData.detail || 'Failed to ingest report.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Network error occurred during ingestion.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvertToTask = async (reportId) => {
    setActioningId(reportId);
    try {
      const res = await authFetch(`http://127.0.0.1:8000/api/reports/${reportId}/convert-to-task`, {
        method: 'POST'
      });
      if (res.ok) {
        fetchRawReports();
        if (onTaskCreated) onTaskCreated(); // Refresh Admin Map and list
      } else {
        const errData = await res.json();
        alert(`Conversion failed: ${errData.detail || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error during report conversion.');
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* 1. Ingestion Form Panel (Left Side - 1 Column) */}
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-slate-900/30 border border-slate-800/80 p-6 rounded-2xl glass shadow-xl glow-brand-sm">
          <h4 className="font-bold text-xs uppercase tracking-widest text-slate-300 border-b border-slate-850 pb-3 flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-brand-400" /> Ingest Live Need Report
          </h4>

          {successMessage && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-xs p-3.5 rounded-xl flex items-start gap-2 mt-4">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3.5 rounded-xl flex items-start gap-2 mt-4">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleCreateReport} className="space-y-4.5 mt-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Description</label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the crisis details, injuries, shelter failures..."
                className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 placeholder-slate-650 focus:outline-none input-premium leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Category</label>
                <input
                  type="text"
                  required
                  value={rawCategory}
                  onChange={(e) => setRawCategory(e.target.value)}
                  placeholder="e.g. shelter"
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 placeholder-slate-650 focus:outline-none input-premium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-3.5 text-xs text-slate-300 font-semibold focus:outline-none input-premium cursor-pointer"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Affected Pop</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={populationAffected}
                  onChange={(e) => setPopulationAffected(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 focus:outline-none input-premium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Corroborations</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={corroborationCount}
                  onChange={(e) => setCorroborationCount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 focus:outline-none input-premium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  required
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 focus:outline-none input-premium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  required
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 focus:outline-none input-premium"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Reporter NGO ID</label>
              <input
                type="number"
                required
                value={reportedById}
                onChange={(e) => setReportedById(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 focus:outline-none input-premium"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full text-xs font-bold text-slate-950 bg-brand-500 hover:bg-brand-600 active:scale-[0.98] rounded-xl py-3 cursor-pointer shadow-md shadow-brand-500/10 hover:shadow-brand-500/20 transition-all flex items-center justify-center gap-1.5"
            >
              {submitting ? 'Ingesting Report...' : 'Submit Need Report'}
            </button>
          </form>
        </div>
      </div>

      {/* 2. Raw Reports Table Panel (Right Side - 2 Columns) */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-slate-900/30 border border-slate-800/80 p-6 rounded-2xl glass shadow-xl flex flex-col min-h-[480px]">
          <h4 className="font-bold text-xs uppercase tracking-widest text-slate-300 border-b border-slate-850 pb-3 flex items-center gap-2 mb-4">
            <ClipboardList className="w-5 h-5 text-brand-400 animate-pulse" /> Unconverted Need Reports Queue
          </h4>

          {loading ? (
            <div className="flex flex-col items-center justify-center flex-1 text-slate-400">
              <span className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-500 mb-2"></span>
              <span className="text-xs font-semibold">Retrieving unlinked submissions...</span>
            </div>
          ) : reports.length > 0 ? (
            <div className="overflow-x-auto border border-slate-850 rounded-xl bg-slate-950/40 shadow-inner flex-1">
              <table className="min-w-full divide-y divide-slate-900 text-left text-xs font-sans">
                <thead className="bg-slate-950/60 text-slate-500 font-mono text-[9px] uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Report</th>
                    <th className="px-5 py-3">Severity & Pop</th>
                    <th className="px-5 py-3">Location Coordinates</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60 text-slate-300 font-medium">
                  {reports.map((rep) => (
                    <tr key={rep.id} className="hover:bg-slate-900/25 transition-all">
                      <td className="px-5 py-4 max-w-xs">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-slate-500 font-mono font-bold">Report ID: #{rep.id}</span>
                          <span className="text-xs text-slate-200 font-semibold leading-relaxed line-clamp-2" title={rep.description}>
                            {rep.description}
                          </span>
                          <span className="text-[9px] text-brand-400 font-bold bg-brand-500/5 px-2 py-0.5 rounded border border-brand-500/10 w-max mt-0.5">
                            {rep.category || 'Uncategorized'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1.5">
                          <span className={`text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded border w-max ${
                            rep.severity === 'critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            rep.severity === 'high' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            rep.severity === 'medium' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            'bg-green-500/10 text-green-400 border-green-500/20'
                          }`}>
                            {rep.severity}
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-500" /> {rep.population_affected} affected
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-[10px] text-slate-400">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{rep.location.latitude.toFixed(4)}, {rep.location.longitude.toFixed(4)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleConvertToTask(rep.id)}
                          disabled={actioningId !== null}
                          className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-brand-400 border border-brand-500/15 bg-brand-500/5 px-3 py-1.5 rounded-xl hover:bg-brand-500/15 transition-all cursor-pointer active:scale-95 shadow-sm"
                        >
                          {actioningId === rep.id ? (
                            <span className="animate-spin rounded-full h-3 w-3 border-t border-brand-400"></span>
                          ) : (
                            <ArrowRight className="w-3.5 h-3.5 text-brand-400" />
                          )}
                          Convert
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-slate-500 bg-slate-950/25 border border-dashed border-slate-850 rounded-2xl glass shadow-inner">
              <CheckCircle className="w-10 h-10 mb-3 text-slate-700" />
              <span className="text-xs font-bold text-slate-400">No raw need reports in queue</span>
              <span className="text-[10px] text-slate-500 mt-1 max-w-xs text-center">All submitted reports have been linked to active tasks or resolved as duplicates.</span>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}
