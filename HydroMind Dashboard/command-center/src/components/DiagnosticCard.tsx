import React, { useState } from 'react';
import { Diagnostic } from '../store/telemetryStore';
import { ChevronDown, ChevronUp, BrainCircuit } from 'lucide-react';

interface Props {
  diagnostic: Diagnostic;
}

export const DiagnosticCard: React.FC<Props> = ({ diagnostic }) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bento-tile overflow-hidden transition-all duration-300 flex-shrink-0"
         style={{ borderColor: 'rgba(20, 184, 166, 0.15)' }}>
      <div
        className="p-3 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2.5">
          <BrainCircuit className="text-teal-400/60 w-4 h-4" />
          <h3 className="font-semibold text-sm text-slate-200">{diagnostic.summary}</h3>
        </div>
        {expanded ? (
          <ChevronUp className="text-slate-500 w-4 h-4" />
        ) : (
          <ChevronDown className="text-slate-500 w-4 h-4" />
        )}
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-white/[0.03]">
          <p className="text-slate-400 text-[11px] leading-relaxed mb-3">
            {diagnostic.details}
          </p>

          <div className="grid grid-cols-2 gap-2">
            {Object.entries(diagnostic.metrics).map(([key, value]) => (
              <div key={key} className="kv-row py-1.5 px-0">
                <span className="kv-label text-[9px]">{key}</span>
                <span className="kv-value teal text-[11px]">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
