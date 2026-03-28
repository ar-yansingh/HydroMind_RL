import React, { useState, useEffect } from 'react';
import { useTelemetryStore } from '../store/telemetryStore';
import { useUIStore } from '../store/uiStore';
import { Activity, Zap, Droplets, AlertTriangle, RotateCcw, Map, MapPin } from 'lucide-react';

export default function TopBar() {
  const telemetry = useTelemetryStore(state => state.telemetry);
  const sendCommand = useTelemetryStore(state => state.sendCommand);
  const connectionStatus = useTelemetryStore(state => state.connectionStatus);
  const { activeTarget, selectedTargets, resetUI, mapMode, setMapMode } = useUIStore();

  const [clock, setClock] = useState('');
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('en-IN', { hour12: false }));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const phase = telemetry?.phase || 'AMBIENT';
  const hasTargets = selectedTargets.size > 0 || !!activeTarget;
  const targetsArray = selectedTargets.size > 0 ? Array.from(selectedTargets) : activeTarget ? [activeTarget] : [];

  const isCrisis = phase === 'RUPTURE' || phase === 'SURGE' || phase === 'SHORTAGE';
  const isRecovery = phase === 'AI_RECOVERY';
  const canTrigger = phase === 'AMBIENT';
  const canDeploy = isCrisis;

  const phaseConfig: Record<string, { label: string; color: string; bg: string }> = {
    'AMBIENT':      { label: 'Monitoring',  color: 'text-emerald-400', bg: 'bg-emerald-500/8 border-emerald-500/20' },
    'RUPTURE':      { label: 'Rupture',     color: 'text-orange-400',  bg: 'bg-orange-500/8 border-orange-500/20' },
    'SURGE':        { label: 'Surge',       color: 'text-amber-400',   bg: 'bg-amber-500/8 border-amber-500/20' },
    'SHORTAGE':     { label: 'Shortage',    color: 'text-amber-300',   bg: 'bg-amber-400/8 border-amber-400/20' },
    'AI_RECOVERY':  { label: 'AI Active',   color: 'text-teal-400',    bg: 'bg-teal-500/8 border-teal-500/20' },
  };
  const pc = phaseConfig[phase] || phaseConfig['AMBIENT'];

  const connDot = connectionStatus === 'CONNECTED' ? 'bg-emerald-400' :
                  connectionStatus === 'CONNECTING' ? 'bg-amber-400' : 'bg-red-400';

  return (
    <header className="bento-tile flex items-center justify-between px-5 py-2.5 bento-grid-topbar">
      {/* Left: Logo + Phase */}
      <div className="flex items-center gap-5">
        <h1 className="text-lg font-bold tracking-tight">
          <span className="text-teal-400">Hydro</span>
          <span className="text-slate-300 font-light">Mind</span>
        </h1>

        <span className={`text-[10px] px-3 py-1 rounded-full border font-semibold tracking-wide ${pc.color} ${pc.bg}`}>
          {pc.label}
        </span>
      </div>

      {/* Center: Scenario actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => sendCommand('trigger_rupture', targetsArray)}
          disabled={!canTrigger || !hasTargets}
          className="hm-btn hm-btn-scenario flex items-center gap-1.5"
        >
          <Droplets size={12} /> Rupture
        </button>
        <button
          onClick={() => sendCommand('trigger_surge', targetsArray)}
          disabled={!canTrigger || !hasTargets}
          className="hm-btn hm-btn-scenario flex items-center gap-1.5"
        >
          <Zap size={12} /> Surge
        </button>
        <button
          onClick={() => sendCommand('trigger_shortage', [])}
          disabled={!canTrigger}
          className="hm-btn hm-btn-scenario flex items-center gap-1.5"
        >
          <AlertTriangle size={12} /> Shortage
        </button>

        <div className="w-px h-6 bg-white/5 mx-1"></div>

        <button
          onClick={() => sendCommand('deploy_ai', [])}
          disabled={!canDeploy}
          className="hm-btn hm-btn-deploy flex items-center gap-2"
        >
          <Activity size={14} />
          Deploy AI Agent
        </button>

        <button
          onClick={() => { sendCommand('reset_ambient', []); resetUI(); }}
          disabled={phase === 'AMBIENT'}
          className="hm-btn hm-btn-reset flex items-center gap-1.5"
        >
          <RotateCcw size={11} /> Reset
        </button>

        {/* ── Map Toggle ── */}
        <div className="w-px h-6 bg-white/5 mx-1"></div>
        <div className="flex items-center rounded-full border border-white/5 overflow-hidden" style={{ background: 'rgba(15,23,42,0.6)' }}>
          <button
            onClick={() => setMapMode('canvas')}
            className={`flex items-center gap-1 px-3 py-1 text-[10px] font-semibold tracking-wide transition-colors ${
              mapMode === 'canvas' ? 'bg-teal-500/15 text-teal-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Map size={10} /> Canvas
          </button>
          <button
            onClick={() => setMapMode('city')}
            className={`flex items-center gap-1 px-3 py-1 text-[10px] font-semibold tracking-wide transition-colors ${
              mapMode === 'city' ? 'bg-teal-500/15 text-teal-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <MapPin size={10} /> City
          </button>
        </div>
      </div>

      {/* Right: Clock + Status */}
      <div className="flex items-center gap-4">
        <span className="font-data text-[10px] text-slate-500">
          T{telemetry?.step || 0}
        </span>
        <span className="font-data text-xs text-slate-400">{clock}</span>
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${connDot} ${connectionStatus === 'CONNECTED' ? 'animate-breathe' : ''}`}></span>
          <span className="text-[9px] text-slate-500 font-medium tracking-wider">
            {connectionStatus === 'CONNECTED' ? 'Live' : connectionStatus === 'CONNECTING' ? 'Connecting' : 'Offline'}
          </span>
        </div>
      </div>
    </header>
  );
}
