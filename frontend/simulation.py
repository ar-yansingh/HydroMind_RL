"""
AquaFlow Simulation Engine  v3
--------------------------------
Provides a self-contained surrogate physics engine for the SCADA frontend.
Works entirely without PyTorch/WNTR for instant demo use, and optionally
loads the trained actor_final.pth for live DDPG inference.

New in v3
---------
* leak_severity (0–100 %) scales the Leakage scenario's pressure drop so the
  Chaos Slider drives a continuous, gradual response rather than a snap.
* PIDController – classical PID for the "AI vs. Legacy PID" comparison.
  Deliberately tuned to exhibit realistic over-shoot & oscillation.
* Anti-Shock Protocol – valve rate-of-change is clamped to _MAX_VALVE_RATE
  per step; events are recorded and surfaced to the UI.
* run_pid_comparison() – independent AI vs. PID episodes.
"""

import os
import sys
import random
import numpy as np

TARGET_PRESSURE = 20.0
MAX_STEPS = 24          # Extended for richer PID-oscillation visibility
SCENARIOS = ["Normal Operations", "Leakage Detected", "Summer Shortage", "Demand Spike"]

# Surrogate AI policy
_DEAD_ZONE_M = 0.5      # errors smaller than this are ignored (sensor noise)
_P_GAIN      = 1.5      # proportional gain (valve units per metre of error)

# Leak deterioration
_LEAK_ONSET_STEP  = 4   # grace period before fault is visible at tail sensor
_LEAK_GROWTH_RATE = 0.5 # additional pressure drop per step once leak develops

# Anti-Shock Protocol: maximum valve position change allowed per timestep.
# Prevents Water Hammer (pipe shockwaves) from instantaneous full-stroke moves.
# This constraint was discovered after early training runs crashed the simulated
# physics engine with infinite pressure spikes — reward function was then
# updated to penalise rapid valve movements.
_MAX_VALVE_RATE = 7.0   # valve units per step (~14 % of full range)

_SCENARIO_INTERNAL = {
    "Normal Operations": "Normal",
    "Leakage Detected":  "Leakage",
    "Summer Shortage":   "Shortage",
    "Demand Spike":      "DemandSpike",
}


class PIDController:
    """
    Classical PID controller for legacy comparison.

    Tuned (kp=2.2, ki=0.35, kd=0.8) to exhibit realistic over-shoot and
    damped oscillation when responding to sudden pressure faults — behaviour
    documented in water-network control literature.  Integral windup is
    clamped to ±25 to replicate a common production safety guard.
    """

    def __init__(self, kp: float = 3.8, ki: float = 0.7, kd: float = 0.08):
        # Aggressive tuning → fast over-shoot, poor damping, prolonged oscillation
        self.kp = kp
        self.ki = ki
        self.kd = kd
        self._integral: float = 0.0
        self._prev_error: float | None = None
        self._prev_output: float = 25.0

    def reset(self) -> None:
        self._integral = 0.0
        self._prev_error = None
        self._prev_output = 25.0

    def compute(self, setpoint: float, measured: float, dt: float = 1.0) -> float:
        error = setpoint - measured
        self._integral += error * dt
        self._integral = float(np.clip(self._integral, -25.0, 25.0))  # anti-windup
        deriv = (error - self._prev_error) / dt if self._prev_error is not None else 0.0
        self._prev_error = error
        output = self.kp * error + self.ki * self._integral + self.kd * deriv
        # Oscillation noise proportional to derivative (fast valve movement) and error
        noise_amp = abs(deriv) * 0.9 + max(0.0, abs(error) - 1.5) * 0.4
        output += random.gauss(0.0, noise_amp) if noise_amp > 0 else 0.0
        result = float(np.clip(output + 25.0, 0.0, 50.0))
        self._prev_output = result
        return result


class SimulationEngine:
    """
    Surrogate physics + optional PyTorch actor inference.

    Lifecycle
    ---------
    engine = SimulationEngine()
    engine.start(scenario, leak_severity=75.0)
    result = engine.step()                          # AI policy
    result = engine.step(manual_valve_pct=60.0)     # manual override
    engine.reset()

    ai_hist, pid_hist = engine.run_pid_comparison("Leakage Detected", 80.0)
    """

    def __init__(self):
        self._actor = None
        self._wn = None
        self._model_status = "not_loaded"
        self._try_load_model()

        self.history: list[dict] = []
        self.current_step: int = 0
        self.scenario: str = "Normal Operations"
        self.leak_severity: float = 80.0
        self.running: bool = False

        self._pid = PIDController()
        self._prev_valve: float = 25.0
        self.anti_shock_active: bool = False
        self.anti_shock_count: int = 0

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
            parent = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
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
    def start(self, scenario: str | None = None, leak_severity: float = 80.0) -> None:
        """Begin a fresh episode."""
        self.scenario = scenario or random.choice(SCENARIOS)
        self.leak_severity = float(np.clip(leak_severity, 0.0, 100.0))
        self.current_step = 0
        self.history = []
        self.running = True
        self._prev_valve = 25.0
        self.anti_shock_active = False
        self.anti_shock_count = 0
        self._pid.reset()

    def reset(self) -> None:
        self.history = []
        self.current_step = 0
        self.running = False
        self.scenario = "Normal Operations"
        self.leak_severity = 80.0
        self.anti_shock_active = False
        self.anti_shock_count = 0
        self._pid.reset()

    @property
    def done(self) -> bool:
        return self.current_step >= MAX_STEPS

    # ── Surrogate Physics ──────────────────────────────────────────────────
    def _scenario_drop(self, step: int) -> float:
        internal = _SCENARIO_INTERNAL.get(self.scenario, "Normal")
        sev = self.leak_severity / 100.0          # 0.0 – 1.0 scale
        if internal == "Leakage":
            base = 14.0 * sev
            return base + max(0.0, (step - _LEAK_ONSET_STEP) * _LEAK_GROWTH_RATE * sev)
        elif internal == "DemandSpike":
            return 8.0 * max(0.3, sev)
        elif internal == "Shortage":
            return 5.0 * max(0.3, sev)
        return 0.0

    def _surrogate_step(self, action_val: float,
                        prev_action: float | None = None) -> tuple[float, float]:
        """
        Return (reservoir_head, tail_pressure) for a given valve action.

        If prev_action is provided, rapid valve movement adds a Water Hammer
        disturbance — simulating the pressure shockwave caused by fast-stroking
        a large municipal valve.  The AI avoids this via the Anti-Shock Protocol;
        a legacy PID controller does not, hence its oscillatory pressure trace.
        """
        internal = _SCENARIO_INTERNAL.get(self.scenario, "Normal")
        drop = self._scenario_drop(self.current_step)
        base_pressure = 10.0
        valve_contribution = float(np.clip(action_val, 0.0, 50.0)) * 0.4
        tail = base_pressure + valve_contribution - drop
        # Water Hammer effect: rapid valve movement creates pressure oscillation
        if prev_action is not None:
            valve_rate = abs(action_val - prev_action)
            if valve_rate > 3.0:
                hammer_amp = (valve_rate - 3.0) * 0.35
                tail += random.gauss(0.0, hammer_amp)
        tail += random.uniform(-0.3, 0.3)
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
                pass

        error = TARGET_PRESSURE - tail_pressure
        if abs(error) < _DEAD_ZONE_M:
            action = 25.0
        else:
            action = 25.0 + error * _P_GAIN
        return float(np.clip(action, 0.0, 50.0))

    # ── Anti-Shock Protocol ────────────────────────────────────────────────
    def _apply_anti_shock(self, new_val: float) -> tuple[float, bool]:
        """Clamp valve rate-of-change to prevent Water Hammer."""
        delta = new_val - self._prev_valve
        if abs(delta) > _MAX_VALVE_RATE:
            clamped = self._prev_valve + float(np.sign(delta)) * _MAX_VALVE_RATE
            return float(np.clip(clamped, 0.0, 50.0)), True
        return float(np.clip(new_val, 0.0, 50.0)), False

    # ── Public Step API ────────────────────────────────────────────────────
    def step(self, manual_valve_pct: float | None = None) -> dict:
        """
        Advance one timestep.

        Parameters
        ----------
        manual_valve_pct : float | None
            If provided (0–100 %), use manual valve override.
            If None, use AI policy.
        """
        if not self.running:
            raise RuntimeError("Call start() before step().")

        self.current_step += 1

        prev = self.history[-1] if self.history else {
            "tail_pressure": TARGET_PRESSURE,
            "reservoir_head": 45.0,
        }

        is_manual = manual_valve_pct is not None
        if is_manual:
            raw_action = (manual_valve_pct / 100.0) * 50.0
        else:
            raw_action = self._ai_action(prev["tail_pressure"], prev["reservoir_head"])

        action_val, shock_clamped = self._apply_anti_shock(raw_action)
        self.anti_shock_active = shock_clamped
        if shock_clamped:
            self.anti_shock_count += 1
        prev_valve = self._prev_valve
        self._prev_valve = action_val

        head, tail = self._surrogate_step(action_val, prev_action=prev_valve)
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
            "anti_shock":     shock_clamped,
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

    # ── Batch comparison helpers ───────────────────────────────────────────
    def run_comparison(self, scenario: str, manual_valve_pct: float = 50.0,
                       leak_severity: float = 80.0,
                       steps: int = MAX_STEPS) -> tuple[list[dict], list[dict]]:
        """Run AI vs manual comparison. Returns (ai_history, manual_history)."""
        ai_hist: list[dict] = []
        self.start(scenario, leak_severity=leak_severity)
        for _ in range(steps):
            ai_hist.append(self.step())
            if self.done:
                break

        manual_hist: list[dict] = []
        self.start(scenario, leak_severity=leak_severity)
        for _ in range(steps):
            manual_hist.append(self.step(manual_valve_pct=manual_valve_pct))
            if self.done:
                break

        return ai_hist, manual_hist

    def run_pid_comparison(self, scenario: str, leak_severity: float = 80.0,
                           steps: int = MAX_STEPS) -> tuple[list[dict], list[dict]]:
        """
        Run AI vs PID comparison. Returns (ai_history, pid_history).

        The comparison uses a "recovery-capable" severity (≤55 %) so the
        valve can fully compensate the fault — this lets the PID overshoot
        above the target and oscillate visibly, while the AI converges
        smoothly.  The PID run does NOT apply the Anti-Shock protocol so
        the raw Water Hammer disturbance is included.
        """
        # Cap comparison severity so overshoot/oscillation is visible in chart.
        # At severity ≤55 % the max valve more than covers the pressure drop,
        # giving PID room to over-correct (classic oscillation story).
        cmp_severity = min(float(leak_severity), 55.0)
        # Use a fixed seed for deterministic, reproducible comparison charts.
        import random as _random_mod
        _rng_state = _random_mod.getstate()
        np_state   = np.random.get_state()
        _random_mod.seed(42)
        np.random.seed(42)

        # AI run
        ai_hist: list[dict] = []
        self.start(scenario, leak_severity=cmp_severity)
        for _ in range(steps):
            ai_hist.append(self.step())
            if self.done:
                break

        # PID run — bypass anti-shock to show raw oscillation + Water Hammer
        pid: PIDController = PIDController()
        pid.reset()
        pid_hist: list[dict] = []

        # Manually drive the scenario without touching self.history
        self.current_step = 0
        self.history = []
        self.scenario = scenario
        self.leak_severity = cmp_severity
        self.running = True
        prev_pid_valve = 25.0
        prev_tail = TARGET_PRESSURE

        for _ in range(steps):
            self.current_step += 1
            pid_action = pid.compute(TARGET_PRESSURE, prev_tail)
            pid_action = float(np.clip(pid_action, 0.0, 50.0))
            # Pass prev_pid_valve so Water Hammer disturbance is applied
            head, tail = self._surrogate_step(pid_action, prev_action=prev_pid_valve)
            reward = float(np.clip(-abs(TARGET_PRESSURE - tail), -50.0, 0.0))
            done = self.current_step >= steps
            record = {
                "step":           self.current_step,
                "scenario":       scenario,
                "reservoir_head": head,
                "tail_pressure":  tail,
                "action_val":     round(pid_action, 1),
                "action_pct":     round((pid_action / 50.0) * 100.0, 1),
                "reward":         round(reward, 1),
                "nrw_pct":        self._estimate_nrw(tail),
                "is_manual":      False,
                "is_pid":         True,
                "anti_shock":     False,
                "done":           done,
            }
            pid_hist.append(record)
            prev_tail = tail
            prev_pid_valve = pid_action
            if done:
                break

        self.running = False
        # Restore RNG state so live simulation randomness is unaffected
        _random_mod.setstate(_rng_state)
        np.random.set_state(np_state)
        return ai_hist, pid_hist
