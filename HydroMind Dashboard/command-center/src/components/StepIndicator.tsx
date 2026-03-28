import React from 'react';
import { useTelemetryStore } from '../store/telemetryStore';

const STEPS = [
  { key: 'monitor',  label: 'Monitor',  icon: '◉' },
  { key: 'respond',  label: 'Respond',  icon: '⚠' },
  { key: 'recover',  label: 'Recover',  icon: '⟳' },
  { key: 'resolved', label: 'Resolved', icon: '✓' },
];

function getActiveStep(phase: string | undefined): number {
  if (!phase || phase === 'AMBIENT') return 0;
  if (phase === 'RUPTURE' || phase === 'SURGE' || phase === 'SHORTAGE') return 1;
  if (phase === 'AI_RECOVERY') return 2;
  return 0;
}

export default function StepIndicator() {
  const phase = useTelemetryStore(s => s.telemetry?.phase);
  const activeIdx = getActiveStep(phase);

  return (
    <div className="w-full px-1 py-3">
      <div className="step-indicator">
        {STEPS.map((step, i) => {
          const isCompleted = i < activeIdx;
          const isActive = i === activeIdx;
          const isCrisis = isActive && i === 1;
          const isRecovery = isActive && i === 2;

          let dotClass = 'step-dot';
          if (isCompleted) dotClass += ' completed';
          else if (isCrisis) dotClass += ' crisis';
          else if (isRecovery) dotClass += ' recovery';
          else if (isActive) dotClass += ' active';

          return (
            <React.Fragment key={step.key}>
              {i > 0 && (
                <div className={`step-line ${isCompleted ? 'filled' : isActive ? 'active-fill' : ''}`} />
              )}
              <div className="flex flex-col items-center gap-1">
                <div className={dotClass}>
                  {isCompleted ? '✓' : step.icon}
                </div>
                <span className={`text-[9px] font-semibold tracking-wider uppercase ${
                  isActive ? 'text-white' : isCompleted ? 'text-emerald-400' : 'text-slate-600'
                }`}>
                  {step.label}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
