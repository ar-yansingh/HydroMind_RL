import React from 'react';
import { useTelemetryStore } from '../../store/telemetryStore';
import { Signal } from 'lucide-react';

export default function NetworkHealth() {
  const telemetry = useTelemetryStore(state => state.telemetry);
  const recoveredNodePct = useTelemetryStore(state => state.recoveredNodePct);

  const analytics = telemetry?.network_analytics;
  const supplyPct = analytics?.supply_fulfillment_pct ?? 100;
  const totalNodes = telemetry?.node_states ? Object.keys(telemetry.node_states).length : 785;
  const activePipes = telemetry?.link_states ? Object.values(telemetry.link_states).filter(l => l.velocity_ms > 0.001).length : 909;
  const closedPipes = telemetry?.closed_links?.length || 0;

  const healthColor = recoveredNodePct > 80 ? '#34d399' : recoveredNodePct > 50 ? '#fbbf24' : '#ea580c';
  const circumference = 2 * Math.PI * 32;
  const dashOffset = circumference - (recoveredNodePct / 100) * circumference;

  return (
    <div className="bento-tile p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-slate-400 font-medium tracking-wide">Network Health</span>
        <Signal size={14} className="text-slate-500" />
      </div>

      {/* Donut Gauge */}
      <div className="flex items-center gap-4 mb-3">
        <div className="relative w-[72px] h-[72px] flex-shrink-0">
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="32" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="5" />
            <circle
              cx="36" cy="36" r="32" fill="none"
              stroke={healthColor} strokeWidth="5"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-data text-sm font-bold" style={{ color: healthColor }}>{recoveredNodePct}%</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 flex-1">
          <div className="kv-row py-1">
            <span className="kv-label">Supply</span>
            <span className={`kv-value ${supplyPct > 80 ? 'teal' : supplyPct > 50 ? 'amber' : 'terra'}`}>{supplyPct}%</span>
          </div>
          <div className="kv-row py-1">
            <span className="kv-label">Nodes</span>
            <span className="kv-value">{totalNodes}</span>
          </div>
        </div>
      </div>

      <div className="kv-row">
        <span className="kv-label">Active Pipes</span>
        <span className="kv-value teal">{activePipes}</span>
      </div>
      <div className="kv-row">
        <span className="kv-label">Closed Valves</span>
        <span className={`kv-value ${closedPipes > 0 ? 'terra' : ''}`}>{closedPipes}</span>
      </div>
    </div>
  );
}
