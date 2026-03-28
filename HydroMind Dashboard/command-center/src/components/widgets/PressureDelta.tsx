import React from 'react';
import { useTelemetryStore } from '../../store/telemetryStore';
import Sparkline from '../Sparkline';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function PressureDelta() {
  const telemetry = useTelemetryStore(state => state.telemetry);
  const pressureHistory = useTelemetryStore(state => state.pressureHistory);

  const pressure = telemetry?.pressure_m ?? 0;
  const baseline = 32.0;
  const delta = pressure - baseline;
  const deltaPct = ((delta / baseline) * 100).toFixed(1);

  const TrendIcon = delta > 1 ? TrendingUp : delta < -1 ? TrendingDown : Minus;
  const trendColor = delta > 1 ? 'text-emerald-400' : delta < -1 ? 'text-orange-400' : 'text-slate-400';

  return (
    <div className="bento-tile p-4 topo-bg">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-slate-400 font-medium tracking-wide">Pressure Delta</span>
        <TrendIcon size={14} className={trendColor} />
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <span className="font-data text-2xl font-bold text-slate-100">{pressure.toFixed(1)}</span>
        <span className="text-[10px] text-slate-500">m</span>
      </div>

      <div className={`flex items-center gap-1 mb-3 ${trendColor}`}>
        <span className="font-data text-xs font-semibold">{delta > 0 ? '+' : ''}{deltaPct}%</span>
        <span className="text-[9px] text-slate-500">vs baseline</span>
      </div>

      <div className="sparkline-container">
        <Sparkline data={pressureHistory} />
      </div>
    </div>
  );
}
