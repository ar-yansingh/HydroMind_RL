import React from 'react';
import { useTelemetryStore } from '../../store/telemetryStore';
import { useUIStore } from '../../store/uiStore';
import Sparkline from '../Sparkline';
import mapData from '../../assets/map_topology.json';

const ALL_LINK_IDS = new Set(mapData.links.map((l: any) => l.id));
const ALL_NODE_IDS = new Set(mapData.nodes.map((n: any) => n.id));

export default function GlobalOversight() {
  const telemetry = useTelemetryStore(state => state.telemetry);
  const sendCommand = useTelemetryStore(state => state.sendCommand);
  const pressureHistory = useTelemetryStore(state => state.pressureHistory);
  const { activeTarget, selectedTargets } = useUIStore();

  const hasSelection = selectedTargets.size > 0 || activeTarget;
  const targetsArray = selectedTargets.size > 0 ? Array.from(selectedTargets) : activeTarget ? [activeTarget] : [];

  const selectionLabel = selectedTargets.size > 1
    ? `${selectedTargets.size} ELEMENTS`
    : activeTarget || 'NONE';

  // Determine what kinds of elements are selected
  const selectedLinks = targetsArray.filter(id => ALL_LINK_IDS.has(id));
  const selectedNodes = targetsArray.filter(id => ALL_NODE_IDS.has(id));
  const hasLinks = selectedLinks.length > 0;
  const hasNodes = selectedNodes.length > 0;

  // Compute live KPIs from node/link states
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

      {/* ── System Status Banner ── */}
      <div className="hm-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-slate-500 tracking-widest uppercase">System Status</h2>
          <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-breathe"></span>
            ALL CLEAR
          </span>
        </div>
        <div className="text-3xl font-extrabold text-emerald-400 font-data tracking-tight">OPERATIONAL</div>
        <p className="text-[11px] text-slate-500 mt-1">All sectors nominal • No anomalies detected</p>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Nodes', value: nodeCount, color: 'text-blue-400' },
          { label: 'Pipes', value: pipeCount, color: 'text-cyan-400' },
          { label: 'Avg P', value: `${avgPressure}m`, color: 'text-emerald-400' },
          { label: 'Flow', value: `${totalFlow}`, color: 'text-amber-400' },
        ].map(kpi => (
          <div key={kpi.label} className="hm-card p-2.5 text-center">
            <p className="text-[9px] text-slate-500 uppercase tracking-wider">{kpi.label}</p>
            <p className={`text-sm font-bold font-data ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* ── Pressure Trend Sparkline ── */}
      <div className="hm-card p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">Pressure Trend</h3>
          <span className="text-[10px] font-data text-blue-400">{pressureHistory.length > 0 ? pressureHistory[pressureHistory.length - 1].toFixed(1) + 'm' : '—'}</span>
        </div>
        <Sparkline data={pressureHistory} color="#3b82f6" height={36} />
      </div>

      {/* ── Active Target ── */}
      <div className="hm-card p-3 flex items-center justify-between">
        <div>
          <p className="text-[9px] text-slate-500 uppercase tracking-wider">Active Target</p>
          <p className={`text-sm font-bold font-data ${selectedTargets.size > 1 ? 'text-violet-400' : activeTarget ? 'text-amber-400' : 'text-slate-600'}`}>
            {selectionLabel}
          </p>
        </div>
        {hasSelection && (
          <span className="text-[9px] px-2 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/30 text-violet-400 font-semibold">
            LOCKED
          </span>
        )}
      </div>

      {/* ── Scenario Injection ── */}
      <div className="hm-card p-4 mt-auto">
        <h3 className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-3 pb-2 border-b border-slate-800">
          Scenario Injection
        </h3>
        
        {/* Valve Controls — only shown when links are selected */}
        {hasLinks && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button onClick={() => sendCommand('toggle_link', selectedLinks, 'CLOSED')}
              className="hm-btn hm-btn-danger text-[10px]">
              ✕ Close Valve{selectedLinks.length > 1 ? ` (${selectedLinks.length})` : ''}
            </button>
            <button onClick={() => sendCommand('toggle_link', selectedLinks, 'OPEN')}
              className="hm-btn hm-btn-success text-[10px]">
              ○ Open Valve{selectedLinks.length > 1 ? ` (${selectedLinks.length})` : ''}
            </button>
          </div>
        )}

        {/* Scenario Buttons — always available when anything is selected */}
        <p className="text-[10px] text-slate-600 mb-3 -mt-1">Select nodes on map → Inject anomaly</p>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <button 
            onClick={() => sendCommand('trigger_surge', targetsArray)} 
            disabled={!hasSelection}
            className="hm-btn hm-btn-warn text-[10px]"
            title="Inject a pressure surge at the selected element(s)">
            ~ Sector Surge {targetsArray.length > 1 ? `(${targetsArray.length})` : ''}
          </button>
          <button 
            onClick={() => sendCommand('trigger_shortage', targetsArray)}
            className="hm-btn text-[10px]"
            style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.35)', color: '#fb923c' }}
            title="Simulate a global supply shortage">
            ▼ Supply Drop
          </button>
        </div>
        <button 
          onClick={() => sendCommand('trigger_rupture', targetsArray)} 
          disabled={!hasSelection}
          className="hm-btn hm-btn-danger w-full text-xs py-3"
          title="Trigger a critical pipe rupture at the selected element(s)">
          ⚠ Critical Rupture {targetsArray.length > 1 ? `(${targetsArray.length} targets)` : ''}
        </button>
      </div>
    </div>
  );
}
