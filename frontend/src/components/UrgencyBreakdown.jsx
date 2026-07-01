import React from 'react';
import { AlertCircle, Clock, Users, ShieldAlert, Award } from 'lucide-react';

export default function UrgencyBreakdown({ breakdown }) {
  if (!breakdown) {
    return (
      <div className="bg-slate-800 p-4 rounded-xl text-center text-slate-400 glass">
        Select a task on the map to see its score breakdown.
      </div>
    );
  }

  const {
    task_id,
    raw_severity,
    severity_score,
    corroboration_count,
    corroboration_score,
    population_affected,
    population_score,
    days_old,
    decay_factor,
    raw_score,
    final_score,
    reasoning
  } = breakdown;

  const severityColor = {
    low: 'text-green-400 bg-green-500/10 border-green-500/30',
    medium: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    high: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    critical: 'text-red-400 bg-red-500/10 border-red-500/30'
  };

  return (
    <div className="bg-slate-800/80 p-6 rounded-xl border border-slate-700 glass space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-wide flex items-center gap-2">
          <Award className="text-brand-500 w-5 h-5" /> Task Urgency Breakdown
        </h3>
        <span className="text-xs text-slate-400 font-mono">ID: {task_id}</span>
      </div>

      {/* Final Urgency Score Display */}
      <div className="flex items-center gap-4 bg-slate-900/60 p-4 rounded-lg border border-slate-800">
        <div className="text-center bg-brand-600/20 border border-brand-500/30 rounded-lg p-2 min-w-[70px]">
          <span className="block text-2xl font-bold font-mono text-brand-400">{final_score.toFixed(1)}</span>
          <span className="text-[10px] uppercase font-semibold text-brand-500">Urgency</span>
        </div>
        <div className="text-xs text-slate-300 leading-relaxed font-sans italic">
          "{reasoning}"
        </div>
      </div>

      <div className="space-y-4">
        {/* Factor 1: Severity */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div className="flex gap-3">
            <ShieldAlert className="w-5 h-5 text-brand-500 mt-0.5" />
            <div>
              <span className="font-medium text-sm block">Severity Factor</span>
              <span className="text-xs text-slate-400">Determined from highest-severity NeedReport</span>
            </div>
          </div>
          <div className="text-right">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${severityColor[raw_severity] || 'text-slate-400'}`}>
              {raw_severity.toUpperCase()}
            </span>
            <span className="block text-sm font-semibold font-mono mt-1 text-slate-200">+{severity_score.toFixed(1)}</span>
          </div>
        </div>

        {/* Factor 2: Corroboration */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-brand-500 mt-0.5" />
            <div>
              <span className="font-medium text-sm block">Corroboration Volume</span>
              <span className="text-xs text-slate-400">{corroboration_count} distinct reports merged</span>
            </div>
          </div>
          <div className="text-right font-mono">
            <span className="text-xs text-slate-400">Raw count: {corroboration_count}</span>
            <span className="block text-sm font-semibold mt-1 text-slate-200">+{corroboration_score.toFixed(2)}</span>
          </div>
        </div>

        {/* Factor 3: Population */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div className="flex gap-3">
            <Users className="w-5 h-5 text-brand-500 mt-0.5" />
            <div>
              <span className="font-medium text-sm block">Population Affected</span>
              <span className="text-xs text-slate-400">Logarithmic scaling of {population_affected} people</span>
            </div>
          </div>
          <div className="text-right font-mono">
            <span className="text-xs text-slate-400">Log10 sum</span>
            <span className="block text-sm font-semibold mt-1 text-slate-200">+{population_score.toFixed(2)}</span>
          </div>
        </div>

        {/* Factor 4: Decay */}
        <div className="flex items-start justify-between pb-1">
          <div className="flex gap-3">
            <Clock className="w-5 h-5 text-brand-500 mt-0.5" />
            <div>
              <span className="font-medium text-sm block">Recency Decay Factor</span>
              <span className="text-xs text-slate-400">Exponential decay over time ({days_old.toFixed(2)} days old)</span>
            </div>
          </div>
          <div className="text-right font-mono">
            <span className="text-xs text-slate-400">Decay multiplier: {decay_factor.toFixed(3)}</span>
            <span className="block text-sm font-semibold mt-1 text-slate-400">e^(-0.1 * t)</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800 text-[11px] text-slate-400 leading-normal">
        <span className="font-semibold text-slate-300 block mb-1">Formula & Decoupled Weighting:</span>
        Urgency Score = Severity Base + (Corroboration Score + Population Score) * Decay Factor.
        Note that severity is decoupled from decay, ensuring critical cores remain prominent.
      </div>
    </div>
  );
}
