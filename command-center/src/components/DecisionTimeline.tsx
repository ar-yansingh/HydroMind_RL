import React, { useRef, useEffect } from 'react';

interface TimelineEntry {
  text: string;
  type: 'valve' | 'alert' | 'stabilize' | 'info';
}

function classifyLog(log: string): TimelineEntry {
  const lower = log.toLowerCase();
  if (lower.includes('valve') || lower.includes('aperture')) return { text: log, type: 'valve' };
  if (lower.includes('alert') || lower.includes('rupture') || lower.includes('critical')) return { text: log, type: 'alert' };
  if (lower.includes('stabiliz') || lower.includes('recover') || lower.includes('saved')) return { text: log, type: 'stabilize' };
  return { text: log, type: 'info' };
}

const TYPE_COLORS: Record<string, { dot: string; text: string; bg: string }> = {
  valve:     { dot: 'bg-blue-400',    text: 'text-blue-300',    bg: 'bg-blue-500/5' },
  alert:     { dot: 'bg-red-400',     text: 'text-red-300',     bg: 'bg-red-500/5' },
  stabilize: { dot: 'bg-emerald-400', text: 'text-emerald-300', bg: 'bg-emerald-500/5' },
  info:      { dot: 'bg-slate-400',   text: 'text-slate-300',   bg: 'bg-slate-500/5' },
};

interface Props {
  logs: string[];
  crisisStart?: number | null;
}

export default function DecisionTimeline({ logs, crisisStart }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs.length]);

  const entries = logs.map(classifyLog);

  return (
    <div className="hm-card p-4 flex-1 flex flex-col min-h-0">
      <h3 className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-3 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-breathe"></span>
        Decision Timeline
        <span className="ml-auto text-[9px] text-slate-600 font-data">{logs.length} events</span>
      </h3>
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[180px]">
        {entries.length === 0 ? (
          <p className="text-[10px] text-slate-600 text-center py-4">Awaiting AI actions…</p>
        ) : (
          entries.map((entry, i) => {
            const colors = TYPE_COLORS[entry.type];
            const relTime = crisisStart 
              ? `T+${Math.max(0, Math.floor((Date.now() - crisisStart) / 1000) - (entries.length - 1 - i) * 2)}s`
              : `#${i + 1}`;
            return (
              <div key={i} className={`flex items-start gap-2 px-2 py-1.5 rounded-lg ${colors.bg} transition-all`}>
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${colors.dot}`}></span>
                <div className="flex-1 min-w-0">
                  <p className={`text-[10px] leading-relaxed ${colors.text} font-medium`}>
                    {entry.text}
                  </p>
                </div>
                <span className="text-[8px] font-data text-slate-600 flex-shrink-0 mt-0.5">{relTime}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
