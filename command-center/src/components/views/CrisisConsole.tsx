import React from 'react';
import { useTelemetryStore } from '../../store/telemetryStore';
import { useUIStore } from '../../store/uiStore';
import mapData from '../../assets/map_topology.json';
import { DiagnosticCard } from '../DiagnosticCard';

const ALL_LINK_IDS = new Set(mapData.links.map((l: any) => l.id));

export default function CrisisConsole() {
  const telemetry = useTelemetryStore(state => state.telemetry);
  const sendCommand = useTelemetryStore(state => state.sendCommand);
  const crisisStartTime = useTelemetryStore(state => state.crisisStartTime);
  const recoveredNodePct = useTelemetryStore(state => state.recoveredNodePct);
  const { activeTarget, selectedTargets, resetUI } = useUIStore();

  const bleed = telemetry?.economic_bleed || 0.0;

  const hasSelection = selectedTargets.size > 0 || activeTarget;
  const targetsArray = selectedTargets.size > 0 ? Array.from(selectedTargets) : activeTarget ? [activeTarget] : [];
  const isSelectedLink = hasSelection && (selectedTargets.size === 0 ? ALL_LINK_IDS.has(activeTarget!) : Array.from(selectedTargets).every(id => ALL_LINK_IDS.has(id)));

  // Affected nodes count
  const affectedNodes = telemetry?.node_states
    ? Object.values(telemetry.node_states).filter(n => n.pressure_m < 5).length
    : 0;
  const closedPipes = telemetry?.closed_links?.length || 0;
  const analytics = telemetry?.network_analytics;
  const supplyPct = analytics?.supply_fulfillment_pct ?? 100;

  return (
    <div className="flex flex-col gap-3 flex-1 view-enter" style={{ minHeight: 0 }}>

      <div className="flex-1 flex flex-col gap-3 overflow-y-auto min-h-0 pr-0.5">

        {/* ── Crisis Header (terracotta, subtle pulse) ── */}
        <div className="hm-card-danger p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-orange-400/80 font-semibold tracking-wide">Economic Impact</span>
            <span className="text-[9px] text-orange-400/50 font-data">Live</span>
          </div>

          <div className="text-3xl font-bold text-orange-400 font-data tracking-tight mb-1">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(bleed)}
          </div>
          <span className="text-[9px] text-slate-500">Cumulative bleed since detection</span>
        </div>

        {/* ── AI Diagnostic Card ── */}
        {telemetry?.diagnostics && telemetry.diagnostics.length > 0 && (
          <DiagnosticCard diagnostic={telemetry.diagnostics[0]} />
        )}

        {/* ── Damage Summary (KV pairs) ── */}
        <div className="bento-tile p-4 flex-shrink-0">
          <span className="text-[10px] text-slate-400 font-medium tracking-wide block mb-3">Damage Assessment</span>
          <div className="kv-row">
            <span className="kv-label">Affected Nodes</span>
            <span className="kv-value terra">{affectedNodes}</span>
          </div>
          <div className="kv-row">
            <span className="kv-label">Isolated Pipes</span>
            <span className="kv-value amber">{closedPipes}</span>
          </div>
          <div className="kv-row">
            <span className="kv-label">Network Health</span>
            <span className={`kv-value ${recoveredNodePct > 70 ? 'teal' : recoveredNodePct > 40 ? 'amber' : 'terra'}`}>{recoveredNodePct}%</span>
          </div>
          <div className="kv-row">
            <span className="kv-label">Supply Fulfillment</span>
            <span className={`kv-value ${supplyPct > 80 ? 'teal' : supplyPct > 50 ? 'amber' : 'terra'}`}>{supplyPct}%</span>
          </div>
        </div>

        {/* ── Supply / Demand Bar ── */}
        <div className="bento-tile p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-slate-400 font-medium tracking-wide">Supply / Demand</span>
            <span className={`font-data text-sm font-semibold ${supplyPct > 80 ? 'text-emerald-400' : supplyPct > 50 ? 'text-amber-400' : 'text-orange-400'}`}>
              {supplyPct}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-white/[0.03] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${supplyPct}%`,
                background: supplyPct > 80 ? '#34d399' : supplyPct > 50 ? '#fbbf24' : '#ea580c'
              }}
            />
          </div>
        </div>

        {/* ── Manual Overrides ── */}
        <div className="bento-tile p-4 flex-shrink-0">
          <span className="text-[10px] text-slate-400 font-medium tracking-wide block mb-2">Manual Overrides</span>
          {isSelectedLink ? (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => sendCommand('toggle_link', targetsArray, 'CLOSED')}
                className="hm-btn hm-btn-danger text-[10px]">
                Close Valve
              </button>
              <button onClick={() => sendCommand('toggle_link', targetsArray, 'OPEN')}
                className="hm-btn hm-btn-success text-[10px]">
                Open Valve
              </button>
            </div>
          ) : (
            <p className="text-[10px] text-slate-500">Select pipes on the map to override</p>
          )}
        </div>
      </div>
    </div>
  );
}
