import React from 'react';
import { AlertCircle, Clock, Users, ShieldAlert, Award, Compass, Calculator } from 'lucide-react';

export default function UrgencyBreakdown({ breakdown }) {
  if (!breakdown) {
    return (
      <div className="bg-slate-900/30 p-8 border border-slate-800/80 rounded-2xl text-center text-slate-400 font-sans glass shadow-lg flex flex-col items-center justify-center min-h-[300px]">
        <Compass className="w-10 h-10 text-slate-700 mb-3 animate-spin-slow" />
        <span className="text-xs font-bold text-slate-500 max-w-[180px]">Select a task on the map to see its score breakdown.</span>
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
    low: 'text-green-400 bg-green-500/10 border-green-500/20',
    medium: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    high: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    critical: 'text-red-400 bg-red-500/10 border-red-500/20'
  };

  return (
    <div className="bg-slate-900/30 p-6 rounded-2xl border border-slate-800 glass shadow-xl space-y-6 glow-brand-sm">
      <div className="flex items-center justify-between border-b border-slate-850 pb-3">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-300 flex items-center gap-2">
          <Award className="text-brand-400 w-5 h-5 animate-pulse" /> Urgency Parameters
        </h3>
        <span className="text-[10px] text-slate-500 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-mono">Task #{task_id}</span>
      </div>

      {/* Final Urgency Score Display */}
      <div className="flex items-center gap-4.5 bg-slate-950/60 p-4.5 rounded-xl border border-slate-900 shadow-inner">
        <div className="text-center bg-brand-500/10 border border-brand-500/20 rounded-xl p-2.5 min-w-[76px] shadow-lg">
          <span className="block text-2xl font-black font-mono text-brand-400 tracking-tighter">{final_score.toFixed(1)}</span>
          <span className="text-[9px] uppercase font-black text-brand-500 tracking-wider">Severity</span>
        </div>
        <div className="text-xs text-slate-300 leading-relaxed font-sans font-medium italic">
          "{reasoning}"
        </div>
      </div>

      <div className="space-y-4">
        {/* Factor 1: Severity */}
        <div className="flex items-start justify-between border-b border-slate-900/60 pb-3.5">
          <div className="flex gap-3">
            <ShieldAlert className="w-5 h-5 text-brand-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-xs text-slate-200 block">Severity Level</span>
              <span className="text-[10px] text-slate-400 leading-normal block">Derived from highest incoming severity report</span>
            </div>
          </div>
          <div className="text-right flex flex-col items-end">
            <span className={`text-[9px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full border ${severityColor[raw_severity] || 'text-slate-400'}`}>
              {raw_severity}
            </span>
            <span className="block text-xs font-black font-mono mt-1.5 text-slate-200">+{severity_score.toFixed(1)}</span>
          </div>
        </div>

        {/* Factor 2: Corroboration */}
        <div className="flex items-start justify-between border-b border-slate-900/60 pb-3.5">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-brand-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-xs text-slate-200 block">Corroboration count</span>
              <span className="text-[10px] text-slate-400 leading-normal block">{corroboration_count} raw reports merged</span>
            </div>
          </div>
          <div className="text-right font-mono flex flex-col items-end">
            <span className="text-[10px] text-slate-400 font-bold bg-slate-950 px-1.5 py-0.5 rounded border border-slate-900">Vol: {corroboration_count}</span>
            <span className="block text-xs font-black mt-1.5 text-slate-200">+{corroboration_score.toFixed(2)}</span>
          </div>
        </div>

        {/* Factor 3: Population */}
        <div className="flex items-start justify-between border-b border-slate-900/60 pb-3.5">
          <div className="flex gap-3">
            <Users className="w-5 h-5 text-brand-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-xs text-slate-200 block">Population Impact</span>
              <span className="text-[10px] text-slate-400 leading-normal block">Logarithmic scale of {population_affected} affected</span>
            </div>
          </div>
          <div className="text-right font-mono flex flex-col items-end">
            <span className="text-[10px] text-slate-400 font-bold bg-slate-950 px-1.5 py-0.5 rounded border border-slate-900">Log10 Base</span>
            <span className="block text-xs font-black mt-1.5 text-slate-200">+{population_score.toFixed(2)}</span>
          </div>
        </div>

        {/* Factor 4: Decay */}
        <div className="flex items-start justify-between pb-1">
          <div className="flex gap-3">
            <Clock className="w-5 h-5 text-brand-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-xs text-slate-200 block">Recency Decay Factor</span>
              <span className="text-[10px] text-slate-400 leading-normal block">Exponential decay over time ({days_old.toFixed(2)}d)</span>
            </div>
          </div>
          <div className="text-right font-mono flex flex-col items-end">
            <span className="text-[10px] text-slate-400 font-bold bg-slate-950 px-1.5 py-0.5 rounded border border-slate-900">Multiplier: {decay_factor.toFixed(3)}</span>
            <span className="block text-xs font-black mt-1.5 text-slate-400">e^(-0.1 * t)</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-900 text-[10px] text-slate-400 leading-relaxed font-sans shadow-inner">
        <span className="font-black text-slate-300 block mb-1 uppercase tracking-wider flex items-center gap-1">
          <Calculator className="w-3.5 h-3.5 text-brand-500" /> Decoupled Decay Formula
        </span>
        Urgency Score = Severity Base + (Corroboration Score + Population Score) * Decay Factor.
        The severity score is decoupled from time decay to ensure highly critical needs remain permanently highlighted.
      </div>
    </div>
  );
}
