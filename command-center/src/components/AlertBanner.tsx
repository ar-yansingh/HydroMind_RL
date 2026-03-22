import React from 'react';
import { useTelemetryStore } from '../store/telemetryStore';

export default function AlertBanner() {
  const alert = useTelemetryStore(state => state.telemetry?.ai_alert);
  
  if (!alert) return null;
  
  return (
    <div className="absolute top-0 left-0 right-0 z-50 animate-slideUp">
      <div className="mx-6 mt-2 px-5 py-3 rounded-xl bg-red-950/80 border border-red-500/40 backdrop-blur-lg flex items-center gap-3 shadow-[0_4px_24px_rgba(239,68,68,0.15)]">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping flex-shrink-0"></span>
        <span className="text-red-300 text-xs font-semibold tracking-wide flex-1">{alert}</span>
        <span className="text-[9px] text-red-400/50 font-data uppercase">Maintenance Required</span>
      </div>
    </div>
  );
}
