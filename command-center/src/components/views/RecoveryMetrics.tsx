import React from 'react';
import { useTelemetryStore } from '../../store/telemetryStore';
import { useUIStore } from '../../store/uiStore';
import DecisionTimeline from '../DecisionTimeline';

export default function RecoveryMetrics() {
  const telemetry = useTelemetryStore(state => state.telemetry);
  const sendCommand = useTelemetryStore(state => state.sendCommand);
  const crisisStartTime = useTelemetryStore(state => state.crisisStartTime);
  const recoveredNodePct = useTelemetryStore(state => state.recoveredNodePct);
  const { baselineLoss, resetUI } = useUIStore();

  const currentLoss = telemetry?.economic_bleed || 0.0;
  const aiSaved = telemetry?.ai_saved || 0.0;
  const totalPredictedLoss = currentLoss + aiSaved;

  // Recovery progress color
  const progressColor = recoveredNodePct > 80 ? '#10b981' : recoveredNodePct > 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col gap-3 flex-1 view-enter">

      {/* ── AI Status Banner ── */}
      <div className="hm-card-glow p-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[10px] text-cyan-400/70 font-bold uppercase tracking-widest">AI Agent Status</h3>
          <span className="flex items-center gap-1.5 text-[9px] text-cyan-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-breathe"></span>
            ACTIVE
          </span>
        </div>
        <p className="text-base font-bold text-cyan-300 font-data">{telemetry?.status || 'INITIALIZING'}</p>
        <div className="mt-2 flex items-center justify-between text-[10px]">
          <span className="text-slate-500">Target Aperture</span>
          <span className="text-blue-400 font-bold font-data">{telemetry?.valve_pct?.toFixed(1) || 100}%</span>
        </div>
      </div>

      {/* ── Split Economics ── */}
      <div className="hm-card p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Economic Impact</h2>
          <span className="text-[8px] px-2 py-0.5 rounded-md border border-amber-500/30 text-amber-400 bg-amber-500/10 font-semibold">
            WHAT-IF ON
          </span>
        </div>

        {/* Current Loss */}
        <div className="text-3xl font-extrabold text-red-500 font-data tracking-tight">
          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(currentLoss)}
        </div>
        <p className="text-[9px] text-slate-600 mt-0.5">Current Bleed</p>
        
        <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-500">Predicted Baseline Loss</span>
            <span className="text-red-400/70 font-data">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalPredictedLoss)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-emerald-400 font-bold">Saved by AI</span>
            <span className="text-emerald-400 font-bold font-data text-base">
              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(aiSaved)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Recovery Progress Bar ── */}
      <div className="hm-card p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] text-slate-500 font-bold tracking-wider uppercase">Network Recovery</h3>
          <span className="font-data text-sm font-bold" style={{ color: progressColor }}>{recoveredNodePct}%</span>
        </div>
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${recoveredNodePct}%`, background: progressColor }}
          />
        </div>
        <p className="text-[9px] text-slate-600 mt-1.5">
          {recoveredNodePct >= 90 ? '● Network near-fully restored' : 
           recoveredNodePct >= 60 ? '◐ Recovery in progress…' : 
           '○ Significant degradation — AI working'}
        </p>
      </div>

      {/* ── Decision Timeline ── */}
      <DecisionTimeline logs={telemetry?.ai_logs || []} crisisStart={crisisStartTime} />

      {/* ── Reset ── */}
      <button onClick={() => { sendCommand('reset_ambient', []); resetUI(); }}
        className="mt-auto text-slate-600 text-[10px] hover:text-slate-300 transition-all py-2 border border-slate-800/50 rounded-lg uppercase tracking-wider font-semibold">
        ↺ Reset Grid to Ambient
      </button>
    </div>
  );
}
