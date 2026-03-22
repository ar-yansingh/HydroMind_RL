import { create } from 'zustand';

// --- Telemetry Types ---
export interface NodeState {
  pressure_m: number;
  demand_lps: number;
}

export interface LinkState {
  flow_lps: number;
  velocity_ms: number;
}

export interface TelemetryPayload {
  step: number;
  phase: 'AMBIENT' | 'RUPTURE' | 'SURGE' | 'SHORTAGE' | 'AI_RECOVERY';
  pressure_m: number;
  valve_pct: number;
  leak_rate_lps: number;
  economic_bleed: number;
  status: string;
  anomaly_node: string | null;
  anomaly_targets: string[];
  scenario: string;
  closed_links: string[];
  ai_logs: string[];
  ai_alert: string | null;
  ai_saved: number;
  node_states?: Record<string, NodeState>;
  link_states?: Record<string, LinkState>;
}

// --- WebSocket & State Store ---
interface TelemetryStore {
  // Data
  telemetry: TelemetryPayload | null;
  connectionStatus: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED';
  
  // Phase 7: History & timing
  pressureHistory: number[];
  crisisStartTime: number | null;
  recoveredNodePct: number;
  
  // Actions
  connect: () => void;
  disconnect: () => void;
  sendCommand: (action: string, targets: string[], status?: string) => void;
}

const HISTORY_MAX = 60;
let ws: WebSocket | null = null;

export const useTelemetryStore = create<TelemetryStore>((set, get) => ({
  telemetry: null,
  connectionStatus: 'DISCONNECTED',
  pressureHistory: [],
  crisisStartTime: null,
  recoveredNodePct: 100,

  connect: () => {
    if (ws && ws.readyState === WebSocket.OPEN) return;
    
    set({ connectionStatus: 'CONNECTING' });
    ws = new WebSocket('ws://localhost:8000/ws/telemetry');

    ws.onopen = () => {
      console.log('Backend connected');
      set({ connectionStatus: 'CONNECTED' });
    };

    ws.onmessage = (event) => {
      const payload: TelemetryPayload = JSON.parse(event.data);
      set((state) => {
        // Merge node/link states if not provided
        if (state.telemetry && !payload.node_states) {
          payload.node_states = state.telemetry.node_states;
          payload.link_states = state.telemetry.link_states;
        }
        
        // Phase 7: Update pressure history (circular buffer)
        const newHistory = [...state.pressureHistory, payload.pressure_m];
        if (newHistory.length > HISTORY_MAX) newHistory.shift();
        
        // Phase 7: Track crisis start time
        let crisisStart = state.crisisStartTime;
        if (
          (payload.phase === 'RUPTURE' || payload.phase === 'SURGE' || payload.phase === 'SHORTAGE') &&
          state.crisisStartTime === null
        ) {
          crisisStart = Date.now();
        } else if (payload.phase === 'AMBIENT') {
          crisisStart = null;
        }
        
        // Phase 7: Compute recovery percentage from node states
        let recoveredPct = 100;
        if (payload.node_states) {
          const nodes = Object.values(payload.node_states);
          if (nodes.length > 0) {
            const healthy = nodes.filter(n => n.pressure_m > 5).length;
            recoveredPct = Math.round((healthy / nodes.length) * 100);
          }
        }
        
        return {
          telemetry: payload,
          pressureHistory: newHistory,
          crisisStartTime: crisisStart,
          recoveredNodePct: recoveredPct,
        };
      });
    };

    ws.onclose = () => {
      console.log('Backend disconnected');
      set({ connectionStatus: 'DISCONNECTED' });
    };

    ws.onerror = (err) => {
      console.error('WebSocket Error:', err);
    };
  },

  disconnect: () => {
    if (ws) {
      ws.close();
      ws = null;
    }
  },

  sendCommand: (action: string, targets: string[], status?: string) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          action,
          target_nodes: targets.length > 0 ? targets : undefined,
          target_node: targets.length === 1 ? targets[0] : undefined,
          status,
        })
      );
    } else {
      console.warn("Cannot send command, WebSocket is disconnected.");
    }
  },
}));
