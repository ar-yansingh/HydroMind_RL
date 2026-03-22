import React, { useState, useEffect } from 'react';
import { useTelemetryStore } from '../../store/telemetryStore';
import { useUIStore } from '../../store/uiStore';
import mapData from '../../assets/map_topology.json';

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

  // Urgency timer
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!crisisStartTime) { setElapsed(0); return; }
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - crisisStartTime) / 1000));
    }, 100);
    return () => clearInterval(interval);
  }, [crisisStartTime]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  // Bleed rate per second (approximate)
  const bleedRate = elapsed > 0 ? (bleed / elapsed) : 0;
  
  // Severity gauge (0-100 based on bleed rate)
  const severity = Math.min(100, bleedRate * 5);
  const gaugeStroke = severity > 70 ? '#ef4444' : severity > 40 ? '#f59e0b' : '#10b981';

  // Affected nodes count
  const affectedNodes = telemetry?.node_states
    ? Object.values(telemetry.node_states).filter(n => n.pressure_m < 5).length
    : 0;
  const closedPipes = telemetry?.closed_links?.length || 0;

  return (
    <div className="flex flex-col gap-3 flex-1 view-enter">

      {/* ── Crisis Header ── */}
      <div className="hm-card-danger p-5 animate-urgentPulse">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold text-red-400 tracking-widest uppercase flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
            Critical Pressure Drop
          </h2>
          {/* Urgency Timer */}
          <div className="text-right">
            <span className="text-[9px] text-red-400/60 uppercase tracking-wider block">Elapsed</span>
            <span className="font-data text-lg font-bold text-red-400">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>
        </div>

        <div className="text-4xl font-extrabold text-red-500 font-data tracking-tight my-2">
          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(bleed)}
        </div>
        <p className="text-[10px] text-red-400/70 uppercase tracking-widest">Live Economic Bleed</p>
      </div>

      {/* ── Damage Summary Row ── */}
      <div className="grid grid-cols-3 gap-2">
        <div className="hm-card p-2.5 text-center">
          <p className="text-[9px] text-slate-500 uppercase">Affected</p>
          <p className="text-lg font-bold font-data text-red-400">{affectedNodes}</p>
          <p className="text-[8px] text-slate-600">nodes</p>
        </div>
        <div className="hm-card p-2.5 text-center">
          <p className="text-[9px] text-slate-500 uppercase">Isolated</p>
          <p className="text-lg font-bold font-data text-amber-400">{closedPipes}</p>
          <p className="text-[8px] text-slate-600">pipes</p>
        </div>
        <div className="hm-card p-2.5 text-center">
          <p className="text-[9px] text-slate-500 uppercase">Health</p>
          <p className={`text-lg font-bold font-data ${recoveredNodePct > 70 ? 'text-emerald-400' : recoveredNodePct > 40 ? 'text-amber-400' : 'text-red-400'}`}>
            {recoveredNodePct}%
          </p>
          <p className="text-[8px] text-slate-600">network</p>
        </div>
      </div>

      {/* ── Severity Gauge + Bleed Rate ── */}
      <div className="hm-card p-4 flex items-center gap-4">
        <div className="severity-gauge flex-shrink-0">
          <svg width="80" height="80" viewBox="0 0 100 100">
            {/* Background arc */}
            <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" strokeWidth="8" 
              strokeDasharray="188.5" strokeDashoffset="62.8" strokeLinecap="round" />
            {/* Value arc */}
            <circle cx="50" cy="50" r="40" fill="none" stroke={gaugeStroke} strokeWidth="8"
              strokeDasharray="188.5" strokeDashoffset={188.5 - (severity / 100) * 125.7}
              strokeLinecap="round" style={{ transition: 'all 0.5s ease' }} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-data text-xs font-bold" style={{ color: gaugeStroke }}>{Math.round(severity)}</span>
          </div>
        </div>
        <div className="flex-1">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Bleed Rate</p>
          <p className="text-xl font-bold font-data text-red-400">₹{bleedRate.toFixed(1)}<span className="text-xs text-slate-500">/s</span></p>
          <p className="text-[10px] text-slate-600 mt-0.5">
            Severity: {severity > 70 ? 'CRITICAL' : severity > 40 ? 'ELEVATED' : 'MODERATE'}
          </p>
        </div>
      </div>

      {/* ── Deploy AI Button ── */}
      <button 
        onClick={() => sendCommand('deploy_ai', [])}
        className="w-full p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold text-base tracking-wide shadow-[0_0_30px_rgba(37,99,235,0.4)] hover:shadow-[0_0_50px_rgba(37,99,235,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all uppercase relative overflow-hidden">
        <span className="relative z-10">⚡ Deploy AI Isolation Agent</span>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
      </button>

      {/* ── Manual Overrides ── */}
      <div className="hm-card p-3">
        <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">Manual Overrides</h4>
        {isSelectedLink ? (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => sendCommand('toggle_link', targetsArray, 'CLOSED')}
              className="hm-btn hm-btn-danger text-[10px]">
              ✕ Close Valve
            </button>
            <button onClick={() => sendCommand('toggle_link', targetsArray, 'OPEN')}
              className="hm-btn hm-btn-success text-[10px]">
              ○ Open Valve
            </button>
          </div>
        ) : (
          <p className="text-center text-[10px] text-slate-600">Select affected pipes to override manually</p>
        )}
      </div>

      {/* ── Abort ── */}
      <button onClick={() => { sendCommand('reset_ambient', []); resetUI(); }}
        className="mt-auto text-slate-600 text-[10px] hover:text-slate-300 transition-all py-2 border border-slate-800/50 rounded-lg uppercase tracking-wider font-semibold">
        ↺ Abort & Reset
      </button>
    </div>
  );
}
