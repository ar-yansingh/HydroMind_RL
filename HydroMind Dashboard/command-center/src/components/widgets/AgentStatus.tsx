import React, { useState, useEffect } from 'react';
import { useTelemetryStore } from '../../store/telemetryStore';
import { BrainCircuit, Eye, ShieldCheck, Loader } from 'lucide-react';

export default function AgentStatus() {
  const telemetry = useTelemetryStore(state => state.telemetry);
  const crisisStartTime = useTelemetryStore(state => state.crisisStartTime);

  const phase = telemetry?.phase || 'AMBIENT';
  const anomalyTargets = telemetry?.anomaly_targets || [];

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!crisisStartTime) { setElapsed(0); return; }
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - crisisStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [crisisStartTime]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  type AgentState = { icon: React.ReactNode; label: string; sublabel: string; color: string };
  const stateMap: Record<string, AgentState> = {
    'AMBIENT':     { icon: <Eye size={18} />,          label: 'Idle',        sublabel: 'Monitoring network',       color: 'text-slate-400' },
    'RUPTURE':     { icon: <Loader size={18} className="animate-spin" />, label: 'Analyzing', sublabel: 'Crisis detected', color: 'text-orange-400' },
    'SURGE':       { icon: <Loader size={18} className="animate-spin" />, label: 'Analyzing', sublabel: 'Demand spike detected', color: 'text-amber-400' },
    'SHORTAGE':    { icon: <Loader size={18} className="animate-spin" />, label: 'Analyzing', sublabel: 'Supply deficit detected', color: 'text-amber-300' },
    'AI_RECOVERY': { icon: <ShieldCheck size={18} />,  label: 'Deployed',    sublabel: 'Containment active',       color: 'text-teal-400' },
  };

  const agentState = stateMap[phase] || stateMap['AMBIENT'];

  return (
    <div className="bento-tile p-4">
      <div className="flex items-center gap-2 mb-4">
        <BrainCircuit size={14} className="text-teal-400/60" />
        <span className="text-[10px] text-slate-400 font-medium tracking-wide">AI Agent</span>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className={`${agentState.color}`}>{agentState.icon}</div>
        <div>
          <div className={`font-semibold text-sm ${agentState.color}`}>{agentState.label}</div>
          <div className="text-[10px] text-slate-500">{agentState.sublabel}</div>
        </div>
      </div>

      {crisisStartTime && (
        <div className="kv-row">
          <span className="kv-label">Elapsed</span>
          <span className={`kv-value ${phase === 'AI_RECOVERY' ? 'teal' : 'terra'}`}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
        </div>
      )}

      {anomalyTargets.length > 0 && (
        <div className="kv-row">
          <span className="kv-label">Target</span>
          <span className="kv-value indigo">{anomalyTargets.slice(0, 3).join(', ')}</span>
        </div>
      )}
    </div>
  );
}
