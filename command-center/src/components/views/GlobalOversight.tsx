import React from 'react';
import { useTelemetryStore } from '../../store/telemetryStore';
import { useUIStore } from '../../store/uiStore';
import mapData from '../../assets/map_topology.json';

const ALL_LINK_IDS = new Set(mapData.links.map((l: any) => l.id));
const ALL_NODE_IDS = new Set(mapData.nodes.map((n: any) => n.id));

export default function GlobalOversight() {
  const telemetry = useTelemetryStore(state => state.telemetry);
  const sendCommand = useTelemetryStore(state => state.sendCommand);
  const { activeTarget, selectedTargets } = useUIStore();

  const hasSelection = selectedTargets.size > 0 || activeTarget;
  const targetsArray = selectedTargets.size > 0 ? Array.from(selectedTargets) : activeTarget ? [activeTarget] : [];

  const selectionLabel = selectedTargets.size > 1
    ? `${selectedTargets.size} elements`
    : activeTarget || '—';

  const selectedLinks = targetsArray.filter(id => ALL_LINK_IDS.has(id));
  const hasLinks = selectedLinks.length > 0;

  const nodeCount = mapData.nodes.length;
  const pipeCount = mapData.links.length;
  const avgPressure = telemetry?.node_states
    ? (Object.values(telemetry.node_states).reduce((s, n) => s + n.pressure_m, 0) / Object.values(telemetry.node_states).length).toFixed(1)
    : '—';
  const totalFlow = telemetry?.link_states
    ? Object.values(telemetry.link_states).reduce((s, l) => s + Math.abs(l.flow_lps), 0).toFixed(1)
    : '—';

  return (
    <div className="flex flex-col gap-3 flex-1 view-enter">

      {/* ── System Status ── */}
      <div className="bento-tile p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-slate-400 font-medium tracking-wide">System Status</span>
          <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-breathe"></span>
            Nominal
          </span>
        </div>
        <div className="text-2xl font-bold text-emerald-400 font-data tracking-tight">Operational</div>
        <p className="text-[10px] text-slate-500 mt-1">All sectors clear — no anomalies detected</p>
      </div>

      {/* ── Network KPIs (KV pairs) ── */}
      <div className="bento-tile p-4">
        <span className="text-[10px] text-slate-400 font-medium tracking-wide block mb-3">Network Overview</span>
        <div className="kv-row">
          <span className="kv-label">Nodes</span>
          <span className="kv-value teal">{nodeCount}</span>
        </div>
        <div className="kv-row">
          <span className="kv-label">Pipes</span>
          <span className="kv-value indigo">{pipeCount}</span>
        </div>
        <div className="kv-row">
          <span className="kv-label">Avg Pressure</span>
          <span className="kv-value seafoam">{avgPressure}m</span>
        </div>
        <div className="kv-row">
          <span className="kv-label">Total Flow</span>
          <span className="kv-value amber">{totalFlow} L/s</span>
        </div>
      </div>

      {/* ── Active Target ── */}
      <div className="bento-tile p-4 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-slate-400 font-medium tracking-wide block mb-1">Selection</span>
          <span className={`text-sm font-semibold font-data ${selectedTargets.size > 1 ? 'text-indigo-400' : activeTarget ? 'text-amber-400' : 'text-slate-600'}`}>
            {selectionLabel}
          </span>
        </div>
        {hasSelection && (
          <span className="text-[9px] px-2 py-0.5 rounded-md bg-indigo-500/8 border border-indigo-500/20 text-indigo-400 font-medium">
            Locked
          </span>
        )}
      </div>

      {/* ── Valve Controls (only when pipes selected) ── */}
      {hasLinks && (
        <div className="bento-tile p-4">
          <span className="text-[10px] text-slate-400 font-medium tracking-wide block mb-2">Valve Control</span>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => sendCommand('toggle_link', selectedLinks, 'CLOSED')}
              className="hm-btn hm-btn-danger text-[10px]">
              Close {selectedLinks.length > 1 ? `(${selectedLinks.length})` : ''}
            </button>
            <button onClick={() => sendCommand('toggle_link', selectedLinks, 'OPEN')}
              className="hm-btn hm-btn-success text-[10px]">
              Open {selectedLinks.length > 1 ? `(${selectedLinks.length})` : ''}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
