import React from 'react';

interface Props { pressure: number; maxPressure?: number; }

export default function PressureGauge({ pressure, maxPressure = 50 }: Props) {
  const pct = Math.min(pressure / maxPressure, 1);
  const angle = -135 + pct * 270; // sweep from -135° to +135°
  const color = pressure >= 20 ? '#059669' : pressure >= 10 ? '#d97706' : '#dc2626';
  const label = pressure >= 20 ? 'Normal' : pressure >= 10 ? 'Low' : 'Critical';

  // SVG arc path
  const cx = 100, cy = 100, r = 72;
  const startAngle = -135 * (Math.PI / 180);
  const endAngle = angle * (Math.PI / 180);
  const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle), y2 = cy + r * Math.sin(endAngle);
  const largeArc = (endAngle - startAngle) > Math.PI ? 1 : 0;
  const arcPath = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;

  // Background arc (full sweep)
  const bgEnd = 135 * (Math.PI / 180);
  const bx2 = cx + r * Math.cos(bgEnd), by2 = cy + r * Math.sin(bgEnd);
  const bgPath = `M ${x1} ${y1} A ${r} ${r} 0 1 1 ${bx2} ${by2}`;

  return (
    <div className="consumer-card" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8, letterSpacing: '0.05em' }}>
        WATER PRESSURE
      </div>
      <svg viewBox="0 0 200 150" style={{ width: '100%', maxWidth: 220 }}>
        {/* Background arc */}
        <path d={bgPath} fill="none" stroke="#e2e8f0" strokeWidth={10} strokeLinecap="round" />
        {/* Value arc */}
        <path d={arcPath} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round"
          style={{ transition: 'all 0.6s ease-out' }} />
        {/* Needle dot */}
        <circle cx={x2} cy={y2} r={5} fill={color} style={{ transition: 'all 0.6s ease-out' }} />
        {/* Value text */}
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize="28" fontWeight="700" fill="#0f172a"
          fontFamily="'JetBrains Mono', monospace">
          {pressure.toFixed(1)}
        </text>
        <text x={cx} y={cy + 22} textAnchor="middle" fontSize="11" fill="#64748b">metres</text>
      </svg>
      <div style={{ fontSize: 13, fontWeight: 600, color, marginTop: 4 }}>{label}</div>
    </div>
  );
}
