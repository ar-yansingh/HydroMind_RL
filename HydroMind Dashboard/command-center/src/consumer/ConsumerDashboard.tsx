import React from 'react';
import { useTelemetryStore } from '../store/telemetryStore';
import { useUIStore } from '../store/uiStore';
import { getProfile, defaultConsumerNode } from './userProfiles';
import ProfileCard from './widgets/ProfileCard';
import PressureGauge from './widgets/PressureGauge';
import QualityRing from './widgets/QualityRing';
import UsageAndPressure from './widgets/UsageChart';
import AlertsFeed from './widgets/AlertsFeed';
import NodeSelector from './widgets/NodeSelector';

/* ═══════════════════════════════════════════════════════════════
   Consumer Dashboard — End-user view of their water service
   Reads the SAME telemetry WebSocket as the Operator dashboard
   so all scenarios are reflected live.
   ═══════════════════════════════════════════════════════════════ */
export default function ConsumerDashboard() {
  const telemetry = useTelemetryStore((s) => s.telemetry);
  const connectionStatus = useTelemetryStore((s) => s.connectionStatus);
  const { consumerNodeId } = useUIStore();

  const nodeId = consumerNodeId || defaultConsumerNode;
  const profile = getProfile(nodeId);

  // ── Live data from shared telemetry ──
  const nodeState = telemetry?.node_states?.[nodeId];
  const pressure = nodeState?.pressure_m ?? 30;
  const demand = nodeState?.demand_lps ?? 0;
  const phase = telemetry?.phase || 'AMBIENT';
  const scenario = telemetry?.scenario || 'MONITORING';
  const anomalyNode = telemetry?.anomaly_node || null;
  const step = telemetry?.step || 0;

  // ── Derive supply status ──
  const status = nodeState?.status || 'NORMAL';
  let supplyStatus = { icon: '✅', text: 'Active Supply', color: '#059669', bg: '#f0fdf4' };
  if (status === 'ISOLATED') {
    supplyStatus = { icon: '🔴', text: 'Supply Suspended', color: '#dc2626', bg: '#fef2f2' };
  } else if (status === 'SURGE_EPICENTER' || status === 'SURGE_CONE') {
    supplyStatus = { icon: '⚡', text: 'Demand Surge Active', color: '#d97706', bg: '#fffbeb' };
  } else if (status === 'SUPPLY_REDUCED' || status === 'AI_SACRIFICED') {
    supplyStatus = { icon: '🔶', text: 'Rationed Supply', color: '#d97706', bg: '#fffbeb' };
  } else if (status?.startsWith('AI_')) {
    supplyStatus = { icon: '🤖', text: 'AI Recovery Active', color: '#0d9488', bg: '#f0fdfa' };
  } else if (pressure < 10) {
    supplyStatus = { icon: '⚠️', text: 'Low Pressure Warning', color: '#dc2626', bg: '#fef2f2' };
  } else if (pressure < 18) {
    supplyStatus = { icon: '⚠️', text: 'Below Normal Pressure', color: '#d97706', bg: '#fffbeb' };
  }

  // ── Quality score (derived from pressure stability) ──
  const qualityScore = Math.min(100, Math.max(0,
    pressure >= 25 ? 95 :
    pressure >= 20 ? 85 :
    pressure >= 15 ? 65 :
    pressure >= 10 ? 40 :
    pressure >= 5 ? 20 : 5
  ));

  // ── Zone health ──
  const zoneId = profile?.address?.match(/DMA-\d+/)?.[0] || 'DMA-1';
  const zoneHealth = telemetry?.network_analytics?.zone_health?.[zoneId];

  if (!profile) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
      Select a user from the dropdown above.
    </div>;
  }

  return (
    <div className="consumer-dashboard">
      {/* ── Header ── */}
      <div className="consumer-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              💧 HydroMind <span style={{ fontWeight: 400, color: '#64748b' }}>Consumer</span>
            </h1>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
              Real-time water service monitoring
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <NodeSelector />
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
            background: connectionStatus === 'CONNECTED' ? '#f0fdf4' : '#fef2f2',
            color: connectionStatus === 'CONNECTED' ? '#059669' : '#dc2626',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: connectionStatus === 'CONNECTED' ? '#059669' : '#dc2626',
            }}/>
            {connectionStatus === 'CONNECTED' ? 'Live' : 'Offline'}
          </div>
          <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace" }}>
            T{step}
          </div>
        </div>
      </div>

      {/* ── Supply Status Banner ── */}
      <div className="consumer-supply-banner" style={{ background: supplyStatus.bg, borderColor: supplyStatus.color + '30' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>{supplyStatus.icon}</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: supplyStatus.color }}>{supplyStatus.text}</div>
            <div style={{ fontSize: 11, color: '#475569' }}>
              {phase === 'AMBIENT' ? 'All systems operating normally' :
               phase === 'RUPTURE' ? 'Network emergency — pipe rupture detected' :
               phase === 'SURGE' ? 'Abnormal demand pattern detected in the network' :
               phase === 'SHORTAGE' ? 'System-wide supply shortage — conservation recommended' :
               phase === 'AI_RECOVERY' ? 'AI-powered recovery in progress — service restoring' :
               scenario}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 10, color: '#64748b' }}>
          <div>Node: <b style={{ color: '#0f172a' }}>{nodeId}</b></div>
          <div>Zone: {zoneId}</div>
        </div>
      </div>

      {/* ── Bento Grid ── */}
      <div className="consumer-grid">
        {/* Column 1: Profile + Zone Health */}
        <div className="consumer-col-1">
          <ProfileCard profile={profile} />

          {/* Zone Neighbourhood Health */}
          <div className="consumer-card">
            <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 10, letterSpacing: '0.05em' }}>
              NEIGHBOURHOOD HEALTH
            </div>
            {zoneHealth ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div className="consumer-stat">
                  <div className="consumer-stat-label">Zone Nodes</div>
                  <div className="consumer-stat-value">{zoneHealth.total_nodes}</div>
                </div>
                <div className="consumer-stat">
                  <div className="consumer-stat-label">Healthy</div>
                  <div className="consumer-stat-value" style={{ color: '#059669' }}>{zoneHealth.health_pct.toFixed(0)}%</div>
                </div>
                <div className="consumer-stat">
                  <div className="consumer-stat-label">Avg Pressure</div>
                  <div className="consumer-stat-value">{zoneHealth.avg_pressure.toFixed(1)}m</div>
                </div>
                <div className="consumer-stat">
                  <div className="consumer-stat-label">Critical</div>
                  <div className="consumer-stat-value" style={{ color: zoneHealth.critical_nodes > 0 ? '#dc2626' : '#059669' }}>
                    {zoneHealth.critical_nodes}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Zone data will appear once telemetry is active.</div>
            )}
          </div>
        </div>

        {/* Column 2: Gauges + Usage */}
        <div className="consumer-col-2">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <PressureGauge pressure={pressure} />
            <QualityRing score={qualityScore} />
          </div>
          <UsageAndPressure profile={profile} demandLps={demand} pressure={pressure} />
        </div>

        {/* Column 3: Alerts */}
        <div className="consumer-col-3">
          <AlertsFeed
            nodeId={nodeId}
            nodeState={nodeState}
            phase={phase}
            anomalyNode={anomalyNode}
            priority={profile.priority}
          />
        </div>
      </div>
    </div>
  );
}
