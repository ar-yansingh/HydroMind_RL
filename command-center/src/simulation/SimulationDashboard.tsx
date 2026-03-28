import React, { useEffect, useRef, useState } from 'react';
import { useTelemetryStore } from '../store/telemetryStore';
import { useUIStore } from '../store/uiStore';
import CanvasMap from '../components/CanvasMap';
import CityMap from '../components/CityMap';

/* ═══════════════════════════════════════════════════════════════
   Simulation Dashboard — Random Multi-Scenario Stress-Test Mode
   Manual deploy with preview, compound highlighting, grade analysis.
   ═══════════════════════════════════════════════════════════════ */
export default function SimulationDashboard() {
  const telemetry = useTelemetryStore((s) => s.telemetry);
  const connectionStatus = useTelemetryStore((s) => s.connectionStatus);
  const sendCommand = useTelemetryStore((s) => s.sendCommand);
  const { mapMode } = useUIStore();

  const simMode = telemetry?.sim_mode || false;
  const simLog = telemetry?.sim_log || [];
  const simResults = telemetry?.sim_results || null;
  const activeEvents = telemetry?.active_events || [];
  const simAiDeployed = telemetry?.sim_ai_deployed || false;
  const phase = telemetry?.phase || 'AMBIENT';
  const step = telemetry?.step || 0;

  const [showConfirm, setShowConfirm] = useState(false);

  const send = (action: string) => {
    sendCommand(action, []);
  };

  const logEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [simLog.length]);

  // Close confirm dialog when simulation stops
  useEffect(() => {
    if (!simMode) setShowConfirm(false);
  }, [simMode]);

  // Count summary stats
  const ruptures = activeEvents.filter((e: any) => e.type === 'RUPTURE');
  const surges = activeEvents.filter((e: any) => e.type === 'SURGE');
  const shortages = activeEvents.filter((e: any) => e.type === 'SHORTAGE');

  // Anomaly node set for map highlighting
  const anomalyTargetSet = new Set<string>(
    activeEvents
      .filter((e: any) => e.target !== 'GLOBAL')
      .map((e: any) => e.target)
  );

  return (
    <div className="sim-dashboard">
      {/* ── Header ── */}
      <div className="sim-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
            <span style={{ opacity: 0.6 }}>🎲</span> HydroMind <span style={{ fontWeight: 400, opacity: 0.6 }}>Simulation</span>
          </h1>
          <div style={{ fontSize: 10, opacity: 0.5 }}>Multi-Scenario Stress Test</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!simMode && (
            <button className="sim-btn sim-btn-primary" onClick={() => send('start_simulation')}>
              Generate Scenario
            </button>
          )}
          {simMode && !simAiDeployed && (
            <button className="sim-btn sim-btn-ai sim-btn-pulse" onClick={() => setShowConfirm(true)}>
              Deploy AI
            </button>
          )}
          {simMode && (
            <button className="sim-btn sim-btn-danger" onClick={() => send('stop_simulation')}>
              Stop & Reset
            </button>
          )}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 14, fontSize: 10, fontWeight: 600,
            background: connectionStatus === 'CONNECTED' ? 'rgba(5,150,105,0.15)' : 'rgba(220,38,38,0.15)',
            color: connectionStatus === 'CONNECTED' ? '#059669' : '#dc2626',
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: connectionStatus === 'CONNECTED' ? '#059669' : '#dc2626' }}/>
            {connectionStatus === 'CONNECTED' ? 'Live' : 'Offline'}
          </div>
          <div style={{ fontSize: 10, opacity: 0.4, fontFamily: "'JetBrains Mono', monospace" }}>T{step}</div>
        </div>
      </div>

      {/* ══ AI Deploy Confirmation Modal ══ */}
      {showConfirm && (
        <div className="sim-modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="sim-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sim-modal-header">
              <span style={{ fontSize: 18 }}>⚡</span>
              <h2>AI Recovery Plan Preview</h2>
            </div>
            <div className="sim-modal-body">
              <p style={{ opacity: 0.6, fontSize: 11, marginBottom: 12 }}>
                The GNN Isolation Agent will execute the following actions:
              </p>
              
              {ruptures.length > 0 && (
                <div className="sim-modal-section">
                  <div className="sim-modal-section-title" style={{ color: '#dc2626' }}>
                    Pipeline Isolation ({ruptures.length})
                  </div>
                  {ruptures.map((e: any, i: number) => (
                    <div key={i} className="sim-modal-action">
                      <span className="sim-modal-bullet" style={{ background: '#dc2626' }} />
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600 }}>Close upstream valve on pipe {e.target}</div>
                        <div style={{ fontSize: 10, opacity: 0.6 }}>
                          Severity {Math.round(e.severity * 100)}% — isolate breach, reroute flow via alternate paths
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {surges.length > 0 && (
                <div className="sim-modal-section">
                  <div className="sim-modal-section-title" style={{ color: '#f59e0b' }}>
                    Demand Surge Response ({surges.length})
                  </div>
                  {surges.map((e: any, i: number) => (
                    <div key={i} className="sim-modal-action">
                      <span className="sim-modal-bullet" style={{ background: '#f59e0b' }} />
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600 }}>Boost supply to node {e.target}</div>
                        <div style={{ fontSize: 10, opacity: 0.6 }}>
                          Demand x{e.multiplier} — open reserve valves, increase supply allocation
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {shortages.length > 0 && (
                <div className="sim-modal-section">
                  <div className="sim-modal-section-title" style={{ color: '#ea580c' }}>
                    Supply Shortage Triage
                  </div>
                  <div className="sim-modal-action">
                    <span className="sim-modal-bullet" style={{ background: '#ea580c' }} />
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600 }}>Activate triage rationing protocol</div>
                      <div style={{ fontSize: 10, opacity: 0.6 }}>
                        Global supply reduced {Math.round(shortages[0].severity * 100)}% — prioritize hospitals & critical infrastructure, ration residential
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="sim-modal-footer">
              <button className="sim-btn sim-btn-danger" onClick={() => setShowConfirm(false)}>
                Cancel
              </button>
              <button className="sim-btn sim-btn-ai" onClick={() => { send('deploy_sim_ai'); setShowConfirm(false); }}>
                Confirm & Deploy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Layout ── */}
      <div className="sim-grid">
        {/* Left: Action Log */}
        <div className="sim-log-panel">
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', marginBottom: 10, opacity: 0.6 }}>
            ACTION LOG
          </div>
          <div className="sim-log-entries">
            {simLog.length === 0 ? (
              <div style={{ fontSize: 12, opacity: 0.4, padding: '20px 0', textAlign: 'center' }}>
                Click "Generate Scenario" to begin a compound stress test.
              </div>
            ) : (
              simLog.map((entry, i) => {
                const isAI = entry.includes('AI ');
                const isSep = entry.includes('───');
                const isScenario = entry.includes('SCENARIO') || entry.includes('RUPTURE:') || entry.includes('SURGE:') || entry.includes('SHORTAGE:');
                const isResult = entry.includes('GRADE') || entry.includes('STABILIZED') || entry.includes('RESULT:');
                const isAction = entry.includes('AI ACTION:');
                return (
                  <div key={i} className={`sim-log-entry ${isAction ? 'sim-log-action' : ''} ${isAI && !isAction ? 'sim-log-ai' : ''} ${isScenario ? 'sim-log-scenario' : ''} ${isResult ? 'sim-log-result' : ''} ${isSep ? 'sim-log-sep' : ''}`}>
                    <span className="sim-log-text">{entry}</span>
                  </div>
                );
              })
            )}
            <div ref={logEndRef} />
          </div>
        </div>

        {/* Center: Map */}
        <div className="sim-map-panel">
          {mapMode === 'canvas' ? (
            <CanvasMap
              scenario={phase}
              valvePct={telemetry?.valve_pct || 100}
              leakRate={telemetry?.leak_rate_lps || 0}
              activeTarget={telemetry?.anomaly_node || null}
              selectedTargets={anomalyTargetSet}
              onSelectTarget={() => {}}
              onMultiSelect={() => {}}
              nodeStates={telemetry?.node_states || {}}
              linkStates={telemetry?.link_states || {}}
              closedLinks={telemetry?.closed_links || []}
            />
          ) : (
            <CityMap
              scenario={phase}
              valvePct={telemetry?.valve_pct || 100}
              leakRate={telemetry?.leak_rate_lps || 0}
              activeTarget={telemetry?.anomaly_node || null}
              selectedTargets={anomalyTargetSet}
              onSelectTarget={() => {}}
              onMultiSelect={() => {}}
              nodeStates={telemetry?.node_states || {}}
              linkStates={telemetry?.link_states || {}}
              closedLinks={telemetry?.closed_links || []}
            />
          )}
          <div className="sim-map-toggle">
            <button className={`sim-map-btn ${mapMode === 'canvas' ? 'active' : ''}`}
              onClick={() => useUIStore.getState().setMapMode('canvas')}>Canvas</button>
            <button className={`sim-map-btn ${mapMode === 'city' ? 'active' : ''}`}
              onClick={() => useUIStore.getState().setMapMode('city')}>City</button>
          </div>

          {/* Floating Banners */}
          {simMode && !simAiDeployed && (
            <div className="sim-crisis-banner">
              <div className="sim-crisis-icon">⚠</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>COMPOUND CRISIS DETECTED</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>
                  {ruptures.length} rupture{ruptures.length !== 1 ? 's' : ''}
                  {' · '}{surges.length} surge{surges.length !== 1 ? 's' : ''}
                  {shortages.length > 0 ? ' · supply shortage' : ''}
                  {' — '}{anomalyTargetSet.size} targets affected
                </div>
                <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>
                  Network under stress. Deploy AI to begin recovery.
                </div>
              </div>
            </div>
          )}
          {simMode && simAiDeployed && !simResults && (
            <div className="sim-recovery-banner">
              <div className="sim-recovery-icon">⚡</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>GNN AGENT ACTIVE</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>
                  Isolating ruptures · Boosting surge zones · Stabilizing pressure
                </div>
              </div>
            </div>
          )}
          {simMode && simResults && (
            <div className="sim-stable-banner">
              <div className="sim-stable-icon">✓</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>NETWORK STABILIZED</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>
                  {simResults.affected_nodes} nodes recovered · Grade {simResults.grade} · {simResults.elapsed_seconds}s
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Scenario Summary + Results */}
        <div className="sim-info-panel">
          {/* Active Events */}
          <div className="sim-card">
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', marginBottom: 10, opacity: 0.6 }}>
              {simMode ? 'ACTIVE EVENTS' : 'SCENARIO'}
            </div>
            {activeEvents.length === 0 ? (
              <div style={{ fontSize: 12, opacity: 0.4 }}>No active scenario</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {activeEvents.map((e: any, i: number) => (
                  <div key={i} className={`sim-event-badge sim-event-${e.type.toLowerCase()}`}>
                    <span className="sim-event-dot" />
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600 }}>{e.type}</div>
                      <div style={{ fontSize: 10, opacity: 0.7 }}>
                        {e.target} {e.severity ? `(${Math.round(e.severity * 100)}%)` : ''}
                        {e.multiplier ? `(x${e.multiplier})` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Impact Assessment / AI Response text */}
          {simMode && (
            <div className="sim-card">
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', marginBottom: 8, opacity: 0.6 }}>
                {simAiDeployed ? 'AI RESPONSE' : 'IMPACT ASSESSMENT'}
              </div>
              {!simAiDeployed ? (
                <div style={{ fontSize: 11, lineHeight: 1.6, opacity: 0.8 }}>
                  {ruptures.length > 0 && (
                    <p style={{ margin: '0 0 6px' }}>
                      <strong style={{ color: '#dc2626' }}>Rupture:</strong> Pipe{ruptures.length > 1 ? 's' : ''} {ruptures.map((e: any) => e.target).join(', ')} compromised. Water leaking at {ruptures.length > 1 ? 'multiple points' : 'the breach point'}, downstream pressure dropping rapidly.
                    </p>
                  )}
                  {surges.length > 0 && (
                    <p style={{ margin: '0 0 6px' }}>
                      <strong style={{ color: '#f59e0b' }}>Surge:</strong> Demand spike at node{surges.length > 1 ? 's' : ''} {surges.map((e: any) => `${e.target} (x${e.multiplier})`).join(', ')}. Local pressure depleting.
                    </p>
                  )}
                  {shortages.length > 0 && (
                    <p style={{ margin: '0 0 6px' }}>
                      <strong style={{ color: '#ea580c' }}>Shortage:</strong> Global supply reduced by {Math.round(shortages[0].severity * 100)}%. Reservoir capacity critically low.
                    </p>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 11, lineHeight: 1.6, opacity: 0.8 }}>
                  {ruptures.length > 0 && (
                    <p style={{ margin: '0 0 6px' }}>
                      <strong style={{ color: '#0d9488' }}>Isolation:</strong> AI closed upstream valves on {ruptures.map((e: any) => e.target).join(', ')}. Flow rerouted.
                    </p>
                  )}
                  {surges.length > 0 && (
                    <p style={{ margin: '0 0 6px' }}>
                      <strong style={{ color: '#0d9488' }}>Boost:</strong> Reserve valves opened for {surges.map((e: any) => e.target).join(', ')}. Supply increased.
                    </p>
                  )}
                  {shortages.length > 0 && (
                    <p style={{ margin: '0 0 6px' }}>
                      <strong style={{ color: '#0d9488' }}>Triage:</strong> Non-critical sectors rationed. Critical zones prioritized.
                    </p>
                  )}
                  {simResults && (
                    <p style={{ margin: '6px 0 0', color: '#059669', fontWeight: 600 }}>
                      Network stabilized in {simResults.elapsed_seconds}s.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Status */}
          <div className="sim-card">
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', marginBottom: 8, opacity: 0.6 }}>STATUS</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: phase === 'AMBIENT' ? '#059669' : phase === 'AI_RECOVERY' ? '#0d9488' : '#dc2626' }}>
              {!simMode ? 'Idle' : !simAiDeployed ? '⚠ Crisis Active — Deploy AI' : simResults ? '✓ Stabilized' : '⚡ AI Recovery In Progress'}
            </div>
            <div style={{ fontSize: 10, opacity: 0.5, marginTop: 4 }}>Phase: {phase}</div>
          </div>

          {/* Results */}
          {simResults && (
            <div className="sim-card sim-results-card">
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', marginBottom: 10, opacity: 0.6 }}>RESULTS</div>
              <div className="sim-grade">
                <span className={`sim-grade-letter grade-${simResults.grade.replace('+', 'plus')}`}>
                  {simResults.grade}
                </span>
              </div>
              <div className="sim-results-grid">
                <div className="sim-result-item">
                  <div className="sim-result-label">Time</div>
                  <div className="sim-result-value">{simResults.elapsed_seconds}s</div>
                </div>
                <div className="sim-result-item">
                  <div className="sim-result-label">Affected</div>
                  <div className="sim-result-value">{simResults.affected_nodes}</div>
                </div>
                <div className="sim-result-item">
                  <div className="sim-result-label">Avg Pressure</div>
                  <div className="sim-result-value">{simResults.avg_pressure_m}m</div>
                </div>
                <div className="sim-result-item">
                  <div className="sim-result-label">Loss</div>
                  <div className="sim-result-value">₹{simResults.economic_loss}</div>
                </div>
                <div className="sim-result-item">
                  <div className="sim-result-label">Events</div>
                  <div className="sim-result-value">{simResults.event_count}</div>
                </div>
                <div className="sim-result-item">
                  <div className="sim-result-label">Shortage</div>
                  <div className="sim-result-value">{simResults.had_shortage ? 'Yes' : 'No'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Grade Analysis */}
          {simResults?.grade_analysis && (
            <div className="sim-card sim-analysis-card">
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', marginBottom: 8, opacity: 0.6 }}>ANALYSIS</div>
              <div style={{ fontSize: 11, lineHeight: 1.7, opacity: 0.85 }}>
                {simResults.grade_analysis.split('. ').filter(Boolean).map((sentence: string, i: number) => {
                  const isGood = sentence.startsWith('✓');
                  const isBad = sentence.startsWith('⚠');
                  const isInfo = sentence.startsWith('ℹ');
                  const isOverall = sentence.startsWith('Overall');
                  return (
                    <p key={i} style={{
                      margin: '0 0 4px',
                      color: isGood ? '#059669' : isBad ? '#dc2626' : isInfo ? '#3b82f6' : isOverall ? 'inherit' : 'inherit',
                      fontWeight: isOverall ? 600 : 400,
                    }}>
                      {sentence.endsWith('.') ? sentence : sentence + '.'}
                    </p>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
