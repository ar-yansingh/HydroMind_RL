import React from 'react';

interface Props { score: number; }

export default function QualityRing({ score }: Props) {
  const clamped = Math.max(0, Math.min(100, score));
  const color = clamped >= 80 ? '#059669' : clamped >= 50 ? '#d97706' : '#dc2626';
  const label = clamped >= 80 ? 'Excellent' : clamped >= 50 ? 'Fair' : 'Poor';

  const r = 50, cx = 60, cy = 60;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className="consumer-card" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8, letterSpacing: '0.05em' }}>
        WATER QUALITY
      </div>
      <svg viewBox="0 0 120 120" style={{ width: '100%', maxWidth: 140 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={8} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }} />
        <text x={cx} y={cy + 2} textAnchor="middle" fontSize="22" fontWeight="700" fill="#0f172a"
          fontFamily="'JetBrains Mono', monospace">{clamped}</text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize="9" fill="#64748b">/100</text>
      </svg>
      <div style={{ fontSize: 13, fontWeight: 600, color, marginTop: 4 }}>{label}</div>
    </div>
  );
}
