import React from 'react';
import { useTelemetryStore } from '../../store/telemetryStore';
import { useUIStore } from '../../store/uiStore';
import DecisionTimeline from '../DecisionTimeline';

export default function RecoveryMetrics() {
  const telemetry = useTelemetryStore(state => state.telemetry);
  const sendCommand = useTelemetryStore(state => state.sendCommand);
  const crisisStartTime = useTelemetryStore(state => state.crisisStartTime);
  const recoveredNodePct = useTelemetryStore(state => state.recoveredNodePct);
  const { resetUI } = useUIStore();

  const currentLoss = telemetry?.economic_bleed || 0.0;
  const aiSaved = telemetry?.ai_saved || 0.0;
  const totalPredictedLoss = currentLoss + aiSaved;
  const progressColor = recoveredNodePct > 80 ? '#34d399' : recoveredNodePct > 50 ? '#fbbf24' : '#ea580c';
  const supplyPct = telemetry?.network_analytics?.supply_fulfillment_pct ?? 100;

  return (
    <div className="flex flex-col gap-3 flex-1 view-enter">

      {/* ── AI Status ── */}
      <div className="hm-card-glow p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-teal-400/70 font-medium tracking-wide">AI Containment</span>
          <span className="flex items-center gap-1.5 text-[9px] text-teal-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-breathe"></span>
            Active
          </span>
        </div>
        <div className="text-base font-semibold text-teal-300 font-data">{telemetry?.status || 'Initializing'}</div>
        <div className="kv-row mt-2">
          <span className="kv-label">Valve Aperture</span>
          <span className="kv-value teal">{telemetry?.valve_pct?.toFixed(1) || 100}%</span>
        </div>
      </div>

      {/* ── Economic Impact ── */}
      <div className="bento-tile p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-slate-400 font-medium tracking-wide">Economic Impact</span>
          <span className="text-[8px] px-2 py-0.5 rounded-md border border-amber-500/15 text-amber-400 bg-amber-500/5 font-medium">
            What-If
          </span>
        </div>

        <div className="text-2xl font-bold text-orange-400 font-data tracking-tight">
          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(currentLoss)}
        </div>
        <span className="text-[9px] text-slate-500">Current bleed</span>

        <div className="mt-3 pt-3 border-t border-white/[0.03]">
          <div className="kv-row">
            <span className="kv-label">Predicted Baseline</span>
            <span className="kv-value terra">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalPredictedLoss)}</span>
          </div>
          <div className="kv-row">
            <span className="kv-label font-semibold text-emerald-400/80">Saved by AI</span>
            <span className="kv-value teal text-base">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(aiSaved)}</span>
          </div>
        </div>
      </div>

      {/* ── Recovery Progress ── */}
      <div className="bento-tile p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-slate-400 font-medium tracking-wide">Network Recovery</span>
          <span className="font-data text-sm font-semibold" style={{ color: progressColor }}>{recoveredNodePct}%</span>
        </div>
        <div className="w-full h-1.5 bg-white/[0.03] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${recoveredNodePct}%`, background: progressColor }}
          />
        </div>
        <p className="text-[9px] text-slate-500 mt-1.5">
          {recoveredNodePct >= 90 ? 'Network near-fully restored' :
           recoveredNodePct >= 60 ? 'Recovery in progress…' :
           'Significant degradation — AI active'}
        </p>
      </div>

      {/* ── Flow Redistribution ── */}
      {telemetry?.network_analytics && (
        <div className="bento-tile p-4">
          <span className="text-[10px] text-slate-400 font-medium tracking-wide block mb-2">Flow Redistribution</span>
          <div className="kv-row">
            <span className="kv-label">Supply Fulfillment</span>
            <span className={`kv-value ${supplyPct > 80 ? 'teal' : supplyPct > 50 ? 'amber' : 'terra'}`}>{supplyPct}%</span>
          </div>
          <p className="text-[9px] text-slate-500 mt-1">AI redistributing flow proportionally</p>
        </div>
      )}

      {/* ── Decision Timeline ── */}
      <DecisionTimeline logs={telemetry?.ai_logs || []} crisisStart={crisisStartTime} />
    </div>
  );
}
