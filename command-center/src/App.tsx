import React, { useEffect } from 'react';
import { useTelemetryStore } from './store/telemetryStore';
import { useUIStore } from './store/uiStore';
import CanvasMap from './components/CanvasMap';
import CityMap from './components/CityMap';
import AlertBanner from './components/AlertBanner';
import StepIndicator from './components/StepIndicator';
import TopBar from './components/TopBar';
import GlobalOversight from './components/views/GlobalOversight';
import CrisisConsole from './components/views/CrisisConsole';
import RecoveryMetrics from './components/views/RecoveryMetrics';
import PressureDelta from './components/widgets/PressureDelta';
import NetworkHealth from './components/widgets/NetworkHealth';
import AgentStatus from './components/widgets/AgentStatus';
import ConsumerDashboard from './consumer/ConsumerDashboard';

function App() {
  const { connect, disconnect, telemetry } = useTelemetryStore();
  const {
    activeTarget,
    selectedTargets,
    setSingleSelection,
    setMultiSelection,
    whatIfMode,
    baselineLoss,
    setBaselineLoss,
    toggleWhatIf,
    mapMode,
    dashboardTab,
    setDashboardTab,
    theme,
    toggleTheme,
  } = useUIStore();

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // Auto-engage What-If on AI deployment
  useEffect(() => {
    if (telemetry?.scenario === 'AI_RECOVERY' && !whatIfMode) {
      toggleWhatIf();
      if (!baselineLoss && telemetry.economic_bleed > 0) {
        setBaselineLoss(telemetry.economic_bleed);
      }
    }
  }, [telemetry?.scenario, whatIfMode, baselineLoss, telemetry?.economic_bleed, toggleWhatIf, setBaselineLoss]);

  const phase = telemetry?.phase || 'AMBIENT';

  return (
    <div className="h-screen flex flex-col overflow-hidden" data-phase={phase} data-theme={theme}>
      {/* ═══ TOP-LEVEL TAB SWITCHER ════════════════════════════ */}
      <div className="dashboard-tab-switcher">
        <div className="tab-switcher-inner">
          <button
            className={`tab-btn ${dashboardTab === 'operator' ? 'tab-btn-active' : ''}`}
            onClick={() => setDashboardTab('operator')}
          >
            🔧 Operator
          </button>
          <button
            className={`tab-btn ${dashboardTab === 'consumer' ? 'tab-btn-active' : ''}`}
            onClick={() => setDashboardTab('consumer')}
          >
            👤 Consumer
          </button>
        </div>
      </div>

      {/* ═══ CONSUMER DASHBOARD ════════════════════════════════ */}
      {dashboardTab === 'consumer' ? (
        <div className="flex-1 overflow-y-auto" style={{ background: '#f8fafc' }}>
          <ConsumerDashboard />
        </div>
      ) : (
        <>
          <AlertBanner />

          {/* ═══ BENTO FLUID GRID ═══════════════════════════════════ */}
          <div className="bento-grid flex-1">

            {/* ── Top Bar ── */}
            <TopBar />

            {/* ── Left Sidebar (data panels) ── */}
            <div className="bento-grid-sidebar">
              <StepIndicator />

              <AgentStatus />

              {/* Contextual View */}
              <div key={phase} className="flex-1 flex flex-col min-h-0">
                { phase === 'AMBIENT' && <GlobalOversight /> }
                { (phase === 'RUPTURE' || phase === 'SURGE' || phase === 'SHORTAGE') && <CrisisConsole /> }
                { phase === 'AI_RECOVERY' && <RecoveryMetrics /> }
              </div>
            </div>

            {/* ── Central Map (largest tile) ── */}
            <div className="bento-grid-map bento-tile">
              {mapMode === 'city' ? (
                <CityMap
                  scenario={telemetry?.scenario || 'AMBIENT'}
                  valvePct={telemetry?.valve_pct ?? 100.0}
                  leakRate={telemetry?.leak_rate_lps || 0}
                  activeTarget={activeTarget}
                  selectedTargets={selectedTargets}
                  onSelectTarget={setSingleSelection}
                  onMultiSelect={setMultiSelection}
                  anomalyNode={telemetry?.anomaly_node}
                  nodeStates={telemetry?.node_states || {}}
                  linkStates={telemetry?.link_states || {}}
                  closedLinks={telemetry?.closed_links || [] as string[]}
                  flowDirections={telemetry?.flow_directions || {}}
                />
              ) : (
                <CanvasMap
                  scenario={telemetry?.scenario || 'AMBIENT'}
                  valvePct={telemetry?.valve_pct ?? 100.0}
                  leakRate={telemetry?.leak_rate_lps || 0}
                  activeTarget={activeTarget}
                  selectedTargets={selectedTargets}
                  onSelectTarget={setSingleSelection}
                  onMultiSelect={setMultiSelection}
                  anomalyNode={telemetry?.anomaly_node}
                  nodeStates={telemetry?.node_states || {}}
                  linkStates={telemetry?.link_states || {}}
                  closedLinks={telemetry?.closed_links || [] as string[]}
                  flowDirections={telemetry?.flow_directions || {}}
                />
              )}

              {/* Selection summary overlay */}
              {selectedTargets.size > 1 && (
                <div className="absolute bottom-4 left-4 bento-tile p-3 z-20 pointer-events-none" style={{ borderColor: 'rgba(129, 140, 248, 0.15)' }}>
                  <h3 className="text-[10px] text-indigo-400 font-semibold mb-1 tracking-wide">Sector ({selectedTargets.size})</h3>
                  <p className="text-[9px] text-indigo-300/60 leading-relaxed max-w-[200px] max-h-16 overflow-y-auto font-data">
                    {Array.from(selectedTargets).slice(0, 12).join(', ')}
                    {selectedTargets.size > 12 && ` +${selectedTargets.size - 12}`}
                  </p>
                </div>
              )}
            </div>

            {/* ── Right Widgets ── */}
            <div className="bento-grid-widgets">
              <PressureDelta />
              <NetworkHealth />
            </div>
          </div>
        </>
      )}

      {/* ═══ THEME TOGGLE (bottom-left) ═══════════════════════ */}
      <button
        className="theme-toggle-btn"
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        <span className="theme-toggle-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
        <span className="theme-toggle-label">{theme === 'dark' ? 'Light' : 'Dark'}</span>
      </button>
    </div>
  );
}

export default App;
