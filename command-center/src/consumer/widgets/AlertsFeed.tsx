import React, { useMemo } from 'react';
import { NodeState } from '../../store/telemetryStore';

interface Props {
  nodeId: string;
  nodeState: NodeState | undefined;
  phase: string;
  anomalyNode: string | null;
  priority: boolean;
}

interface Alert {
  time: string;
  title: string;
  detail: string;
  severity: 'info' | 'warning' | 'danger' | 'success';
}

export default function AlertsFeed({ nodeId, nodeState, phase, anomalyNode, priority }: Props) {
  const alerts = useMemo(() => {
    const list: Alert[] = [];
    const now = new Date();
    const fmt = (m: number) => {
      const d = new Date(now.getTime() - m * 60000);
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const status = nodeState?.status || 'NORMAL';
    const pressure = nodeState?.pressure_m ?? 30;

    // ── Scenario-aware alerts (synced with operator) ──
    if (phase === 'RUPTURE') {
      if (anomalyNode === nodeId) {
        list.push({ time: fmt(0), title: 'Pipe Rupture at Your Connection',
          detail: 'A major pipe rupture has been detected at your supply node. Water service is interrupted. Emergency crews have been dispatched.',
          severity: 'danger' });
      } else if (status === 'ISOLATED') {
        list.push({ time: fmt(0), title: 'Supply Temporarily Suspended',
          detail: 'Your area has been isolated to contain a nearby pipe rupture. Supply will be restored once repairs are complete.',
          severity: 'danger' });
      } else if (pressure < 15) {
        list.push({ time: fmt(1), title: 'Reduced Water Pressure',
          detail: `Pressure has dropped to ${pressure.toFixed(1)}m due to a network emergency. Consider storing water as a precaution.`,
          severity: 'warning' });
      } else {
        list.push({ time: fmt(2), title: 'Network Alert — Pipe Rupture Detected',
          detail: 'A rupture has been detected elsewhere in the network. Your supply is currently unaffected but may experience minor pressure variations.',
          severity: 'info' });
      }
    }

    if (phase === 'SURGE') {
      if (status === 'SURGE_EPICENTER' || status === 'SURGE_CONE') {
        list.push({ time: fmt(0), title: 'Abnormal Demand Spike in Your Area',
          detail: `Your area is experiencing unusual water demand. Pressure: ${pressure.toFixed(1)}m. Please reduce non-essential usage.`,
          severity: 'danger' });
      } else if (pressure < 18) {
        list.push({ time: fmt(1), title: 'Pressure Below Normal',
          detail: `Current pressure: ${pressure.toFixed(1)}m. A demand surge in a nearby sector is causing reduced flow. Expected to recover shortly.`,
          severity: 'warning' });
      } else {
        list.push({ time: fmt(3), title: 'Demand Surge Detected Nearby',
          detail: 'A localized demand spike has been detected in the network. Your supply remains stable.',
          severity: 'info' });
      }
    }

    if (phase === 'SHORTAGE') {
      if (status === 'SUPPLY_REDUCED' || status === 'AI_SACRIFICED') {
        list.push({ time: fmt(0), title: 'Rationed Supply Active',
          detail: `Your area is under managed rationing due to a system-wide shortage. ${priority ? 'As a priority connection, you have guaranteed minimum supply.' : 'Please conserve water.'}`,
          severity: 'warning' });
      } else {
        list.push({ time: fmt(2), title: 'System Shortage Advisory',
          detail: 'The network is operating with reduced capacity. Your supply is currently stable.',
          severity: 'info' });
      }
    }

    if (phase === 'AI_RECOVERY') {
      if (status?.startsWith('AI_')) {
        list.push({ time: fmt(0), title: 'AI Recovery in Progress',
          detail: 'HydroMind AI is actively optimizing your supply. Pressure and flow are being restored to normal levels.',
          severity: 'success' });
      }
      list.push({ time: fmt(1), title: 'Automated Response Deployed',
        detail: 'Our AI system has identified the issue and is rerouting supply to minimize disruption to your area.',
        severity: 'success' });
    }

    // ── Always-on baseline alerts ──
    if (phase === 'AMBIENT' && pressure >= 18) {
      list.push({ time: fmt(0), title: 'All Systems Normal',
        detail: `Your water supply is operating normally. Pressure: ${pressure.toFixed(1)}m.`,
        severity: 'success' });
    }

    if (priority) {
      list.push({ time: '—', title: 'Priority Connection Active',
        detail: 'Your connection is classified as critical infrastructure with guaranteed supply priority.',
        severity: 'info' });
    }

    // Pad with generic info if too few
    if (list.length < 2) {
      list.push({ time: fmt(30), title: 'Daily Supply Schedule',
        detail: 'Water supply active: 6:00 AM – 10:00 PM. Off-peak hours may have reduced pressure.',
        severity: 'info' });
    }

    return list;
  }, [nodeId, nodeState, phase, anomalyNode, priority]);

  // Severity indicator dots instead of emojis
  const sevStyles: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    info:    { bg: '#f0f9ff', border: '#bae6fd', text: '#0369a1', dot: '#0ea5e9' },
    warning: { bg: '#fffbeb', border: '#fde68a', text: '#92400e', dot: '#f59e0b' },
    danger:  { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', dot: '#ef4444' },
    success: { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', dot: '#22c55e' },
  };

  return (
    <div className="consumer-card" style={{ maxHeight: 340, overflowY: 'auto' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 10, letterSpacing: '0.05em' }}>
        ALERTS & ADVISORIES
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {alerts.map((a, i) => {
          const s = sevStyles[a.severity];
          return (
            <div key={i} style={{
              padding: '10px 12px', borderRadius: 10,
              background: s.bg, border: `1px solid ${s.border}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: s.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
                  {a.title}
                </span>
                <span style={{ fontSize: 9, color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace", flexShrink: 0, marginLeft: 8 }}>{a.time}</span>
              </div>
              <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.5, paddingLeft: 13 }}>{a.detail}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
