"""
AquaFlow Simulation Engine
--------------------------
Provides a self-contained surrogate physics engine for the SCADA frontend.
Works entirely without PyTorch/WNTR for instant demo use, and optionally
loads the trained actor_final.pth for live DDPG inference.
"""

import os
import sys
import random
import numpy as np

TARGET_PRESSURE = 20.0
MAX_STEPS = 12
SCENARIOS = ["Normal Operations", "Leakage Detected",
             "Summer Shortage", "Demand Spike"]

# Surrogate AI policy tuning
# Dead zone: errors smaller than this (m) are ignored to avoid amplifying sensor noise.
_DEAD_ZONE_M = 0.5
# P-gain: units of valve action per metre of pressure error.  Chosen empirically so the
# surrogate converges in 3–5 steps while still responding decisively to large deviations.
_P_GAIN = 1.5

# Leak deterioration model: full pressure drop only begins at this step to give the
# operator/agent a "grace period" before the fault is visible on the tail sensor.
_LEAK_ONSET_STEP = 4
# Additional pressure drop per step once the leak is fully developed (m/step).
_LEAK_GROWTH_RATE = 0.6

# ── Internal mapping to the training env's scenario names ──────────────────
_SCENARIO_INTERNAL = {
    "Normal Operations": "Normal",
    "Leakage Detected":  "Leakage",
    "Summer Shortage":   "Shortage",
    "Demand Spike":      "DemandSpike",
}


class SimulationEngine:
    """
    Surrogate physics + optional PyTorch actor inference.

    Lifecycle
    ---------
    engine = SimulationEngine()
    engine.start(scenario)       # begin a new episode
    result = engine.step()       # advance one timestep (AI or manual)
    result = engine.step(manual_valve_pct=60.0)   # manual override
    engine.reset()               # clear history
    """

    def __init__(self):
        self._actor = None
        self._wn = None
        self._model_status = "not_loaded"
        self._try_load_model()

        self.history: list[dict] = []
        self.current_step: int = 0
        self.scenario: str = "Normal Operations"
        self.running: bool = False

    # ── Model Loading ──────────────────────────────────────────────────────
    def _try_load_model(self):
        """Attempt to load actor_final.pth; silently fall back to surrogate."""
        checkpoint = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "models", "checkpoints", "actor_final.pth"
        )
        if not os.path.exists(checkpoint):
            self._model_status = "no_checkpoint"
            return

        try:
            import torch
            parent = os.path.dirname(
                os.path.dirname(os.path.abspath(__file__)))
            if parent not in sys.path:
                sys.path.insert(0, parent)

            from models.ddpg_agent import Actor
            from utils.graph_builder import network_to_graph
            import wntr

            actor = Actor(num_node_features=3, hidden_dim=64,
                          action_dim=1, max_action=50.0)
            actor.load_state_dict(torch.load(checkpoint, map_location="cpu",
                                             weights_only=True))
            actor.eval()

            data_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                "data", "networks", "L-Town.inp"
            )
            wn = wntr.network.WaterNetworkModel(data_path)
            self._actor = actor
            self._wn = wn
            self._network_to_graph = network_to_graph
            self._torch = torch
            self._model_status = "loaded"
        except Exception as exc:
            self._model_status = f"error: {str(exc)[:80]}"

    @property
    def model_status(self) -> str:
        return self._model_status

    @property
    def model_loaded(self) -> bool:
        return self._model_status == "loaded"

    # ── Episode Control ────────────────────────────────────────────────────
    def start(self, scenario: str | None = None):
        """Begin a fresh episode."""
        self.scenario = scenario or random.choice(SCENARIOS)
        self.current_step = 0
        self.history = []
        self.running = True

    def reset(self):
        self.history = []
        self.current_step = 0
        self.running = False
        self.scenario = "Normal Operations"

    @property
    def done(self) -> bool:
        return self.current_step >= MAX_STEPS

    # ── Surrogate Physics ──────────────────────────────────────────────────
    def _scenario_drop(self, step: int) -> float:
        internal = _SCENARIO_INTERNAL.get(self.scenario, "Normal")
        if internal == "Leakage":
            base = 12.0
            return base + max(0.0, (step - _LEAK_ONSET_STEP) * _LEAK_GROWTH_RATE)
        elif internal == "DemandSpike":
            return 8.0
        elif internal == "Shortage":
            return 5.0
        return 0.0

    def _surrogate_step(self, action_val: float) -> tuple[float, float]:
        """Return (reservoir_head, tail_pressure) for a given valve action."""
        internal = _SCENARIO_INTERNAL.get(self.scenario, "Normal")
        drop = self._scenario_drop(self.current_step)

        base_pressure = 10.0
        valve_contribution = float(np.clip(action_val, 0.0, 50.0)) * 0.4
        tail = base_pressure + valve_contribution - drop
        tail += random.uniform(-0.5, 0.5)
        tail = max(0.0, tail)

        head = 30.0 if internal == "Shortage" else 45.0
        return head, round(tail, 2)

    # ── AI Policy ──────────────────────────────────────────────────────────
    def _ai_action(self, tail_pressure: float, reservoir_head: float) -> float:
        """DDPG inference if model loaded, else rule-based surrogate policy."""
        if self.model_loaded:
            try:
                pressures = {
                    self._wn.junction_name_list[0]: reservoir_head,
                    self._wn.junction_name_list[-1]: tail_pressure,
                }
                graph = self._network_to_graph(self._wn, pressures)
                with self._torch.no_grad():
                    action_tensor = self._actor(graph)
                return float(action_tensor.item())
            except Exception:
                pass  # fall through to rule-based

        # Rule-based policy that mimics trained DDPG behaviour.
        # A dead zone prevents amplifying sensor noise in steady state;
        # a moderate gain drives fast recovery during crisis scenarios.
        error = TARGET_PRESSURE - tail_pressure
        if abs(error) < _DEAD_ZONE_M:
            # Within tolerance: hold the near-optimal valve position
            action = 25.0
        else:
            action = 25.0 + error * _P_GAIN
        return float(np.clip(action, 0.0, 50.0))

    # ── Public Step API ────────────────────────────────────────────────────
    def step(self, manual_valve_pct: float | None = None) -> dict:
        """
        Advance one timestep.

        Parameters
        ----------
        manual_valve_pct : float | None
            If provided (0–100 %), use manual valve override.
            If None, use AI policy.

        Returns
        -------
        dict with keys: step, scenario, reservoir_head, tail_pressure,
                        action_pct, reward, nrw_pct, ai_action, done
        """
        if not self.running:
            raise RuntimeError("Call start() before step().")

        self.current_step += 1

        # Last known pressure (for AI policy).  Start from nominal 20 m so
        # the first AI decision is close to target and avoids cold-start overshoot.
        prev = self.history[-1] if self.history else {
            "tail_pressure": TARGET_PRESSURE,
            "reservoir_head": 45.0,
        }

        is_manual = manual_valve_pct is not None
        if is_manual:
            # Convert 0-100% to 0-50 valve units
            action_val = (manual_valve_pct / 100.0) * 50.0
        else:
            action_val = self._ai_action(
                prev["tail_pressure"], prev["reservoir_head"]
            )

        head, tail = self._surrogate_step(action_val)
        reward = float(np.clip(-abs(TARGET_PRESSURE - tail), -50.0, 0.0))
        done = self.current_step >= MAX_STEPS

        record = {
            "step":           self.current_step,
            "scenario":       self.scenario,
            "reservoir_head": head,
            "tail_pressure":  tail,
            "action_val":     round(action_val, 1),
            "action_pct":     round((action_val / 50.0) * 100.0, 1),
            "reward":         round(reward, 1),
            "nrw_pct":        self._estimate_nrw(tail),
            "is_manual":      is_manual,
            "done":           done,
        }
        self.history.append(record)

        if done:
            self.running = False
        return record

    def _estimate_nrw(self, tail: float) -> float:
        """Estimate Non-Revenue Water loss percentage from tail pressure."""
        if tail < 5.0:
            return 18.5
        elif tail < 10.0:
            return 12.0
        elif tail < 15.0:
            return 6.1
        elif tail < 18.0:
            return 5.5
        return 4.2

    # ── Batch comparison helper ────────────────────────────────────────────
    def run_comparison(self, scenario: str, manual_valve_pct: float = 50.0,
                       steps: int = MAX_STEPS) -> tuple[list[dict], list[dict]]:
        """
        Run two full episodes (AI vs manual) for comparison.
        Returns (ai_history, manual_history).
        """
        ai_hist = []
        self.start(scenario)
        for _ in range(steps):
            ai_hist.append(self.step())
            if self.done:
                break

        manual_hist = []
        self.start(scenario)
        for _ in range(steps):
            manual_hist.append(self.step(manual_valve_pct=manual_valve_pct))
            if self.done:
                break

        return ai_hist, manual_hist
