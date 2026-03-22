import React, { useEffect, useState } from 'react';
import { useTelemetryStore } from './store/telemetryStore';
import { useUIStore } from './store/uiStore';
import CanvasMap from './components/CanvasMap';
import AlertBanner from './components/AlertBanner';
import StepIndicator from './components/StepIndicator';
import GlobalOversight from './components/views/GlobalOversight';
import CrisisConsole from './components/views/CrisisConsole';
import RecoveryMetrics from './components/views/RecoveryMetrics';

function App() {
  const { connect, disconnect, telemetry, connectionStatus } = useTelemetryStore();
  const { 
    activeTarget, 
    selectedTargets, 
    setSingleSelection, 
    setMultiSelection,
    whatIfMode,
    baselineLoss,
    setBaselineLoss,
    toggleWhatIf
  } = useUIStore();

  // Live clock
  const [clock, setClock] = useState('');
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('en-IN', { hour12: false }));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // Auto-engage What-If on AI deployment
  useEffect(() => {
    if (telemetry?.scenario === 'AI_RECOVERY' && !whatIfMode) {
        toggleWhatIf();
        if (!baselineLoss && telemetry.economic_bleed > 0) {
            setBaselineLoss(telemetry.economic_bleed);
        }
    }
  }, [telemetry?.scenario, whatIfMode, baselineLoss, telemetry?.economic_bleed, toggleWhatIf, setBaselineLoss]);

  const phase = telemetry?.phase || 'AMBIENT';
  
  // Phase label config
  const phaseConfig: Record<string, { label: string; color: string; bg: string }> = {
    'AMBIENT':      { label: 'MONITORING',  color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
    'RUPTURE':      { label: 'RUPTURE',     color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30' },
    'SURGE':        { label: 'SURGE',       color: 'text-yellow-400',  bg: 'bg-yellow-500/10 border-yellow-500/30' },
    'SHORTAGE':     { label: 'SHORTAGE',    color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/30' },
    'AI_RECOVERY':  { label: 'AI RECOVERY', color: 'text-cyan-400',    bg: 'bg-cyan-500/10 border-cyan-500/30' },
  };
  const pc = phaseConfig[phase] || phaseConfig['AMBIENT'];

  // Connection status config
  const connConfig: Record<string, { color: string; label: string }> = {
    'CONNECTED':    { color: 'bg-emerald-400', label: 'LIVE' },
    'CONNECTING':   { color: 'bg-yellow-400',  label: 'CONNECTING' },
    'DISCONNECTED': { color: 'bg-red-400',     label: 'OFFLINE' },
  };
  const cc = connConfig[connectionStatus];

  return (
    <div className="h-screen flex flex-col bg-[var(--hm-bg)] text-[var(--hm-text)] overflow-hidden">
      <AlertBanner />
      
      {/* ═══ TOP HEADER BAR ═══════════════════════════════════ */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-800/50 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-extrabold text-blue-400 tracking-wider">
            Hydro<span className="text-slate-300">Mind</span>
          </h1>
          <span className="text-[9px] text-slate-600 font-medium tracking-wider uppercase hidden sm:block">SCADA Command Center</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Phase Pill */}
          <span className={`text-[9px] px-3 py-1 rounded-full border font-bold tracking-wider ${pc.color} ${pc.bg}`}>
            {pc.label}
          </span>
          
          {/* Step Counter */}
          <span className="font-data text-[10px] text-slate-600">
            T{telemetry?.step || 0}
          </span>

          {/* Clock */}
          <span className="font-data text-xs text-slate-500">{clock}</span>
          
          {/* Connection Status */}
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${cc.color} ${connectionStatus === 'CONNECTED' ? 'animate-breathe' : ''}`}></span>
            <span className="text-[9px] text-slate-500 font-semibold tracking-wider">{cc.label}</span>
          </div>
        </div>
      </header>

      {/* ═══ MAIN BODY ════════════════════════════════════════ */}
      <div className="flex-1 flex gap-4 p-4 min-h-0">
        
        {/* ── LEFT SIDEBAR ── */}
        <div className="w-[340px] flex-shrink-0 flex flex-col gap-2 overflow-y-auto pr-1">
          {/* Step Indicator */}
          <StepIndicator />
          
          {/* Contextual View (animated transitions via key swap) */}
          <div key={phase} className="flex-1 flex flex-col min-h-0">
            { phase === 'AMBIENT' && <GlobalOversight /> }
            { (phase === 'RUPTURE' || phase === 'SURGE' || phase === 'SHORTAGE') && <CrisisConsole /> }
            { phase === 'AI_RECOVERY' && <RecoveryMetrics /> }
          </div>
        </div>
        
        {/* ── RIGHT: MAP PANEL ── */}
        <div className="flex-1 relative min-h-0">
          <CanvasMap
            scenario={telemetry?.scenario || 'AMBIENT'}
            valvePct={telemetry?.valve_pct ?? 100.0}
            leakRate={telemetry?.leak_rate_lps || 0}
            activeTarget={activeTarget}
            selectedTargets={selectedTargets}
            onSelectTarget={setSingleSelection}
            onMultiSelect={setMultiSelection}
            anomalyNode={telemetry?.anomaly_node}
            nodeStates={telemetry?.node_states || {}}
            linkStates={telemetry?.link_states || {}}
            closedLinks={telemetry?.closed_links || [] as string[]}
          />
          
          {/* Selection summary overlay */}
          {selectedTargets.size > 1 && (
            <div className="absolute bottom-4 left-4 hm-card p-3 z-20 pointer-events-none border-violet-800/40">
              <h3 className="text-[10px] text-violet-400 font-bold mb-1 tracking-wider">SECTOR ({selectedTargets.size})</h3>
              <p className="text-[9px] text-violet-300/70 leading-relaxed max-w-[200px] max-h-16 overflow-y-auto font-data">
                {Array.from(selectedTargets).slice(0, 12).join(', ')}
                {selectedTargets.size > 12 && ` +${selectedTargets.size - 12}`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
