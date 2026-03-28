import gymnasium as gym
from gymnasium import spaces
import numpy as np
import wntr
import random
import gc


class AquaFlowEnv(gym.Env):
    def __init__(self, network_file='data/networks/L-Town.inp'):
        super(AquaFlowEnv, self).__init__()
        self.network_file = network_file

        self.wn = wntr.network.WaterNetworkModel(self.network_file)
        print(f"Successfully loaded {network_file}")

        self.wn.options.time.duration = 12 * 3600
        self.wn.options.time.hydraulic_timestep = 3600

        self.tank_id = self.wn.reservoir_name_list[0] if self.wn.reservoir_name_list else self.wn.tank_name_list[0]

        if self.wn.valve_name_list:
            self.ctrl_link = self.wn.valve_name_list[0]
        else:
            self.ctrl_link = self.wn.pump_name_list[0]

        self.node_a = self.wn.junction_name_list[0]
        self.node_b = self.wn.junction_name_list[-1]
        self.leak_node = self.wn.junction_name_list[len(
            self.wn.junction_name_list)//2]

        # Action Space
        self.action_space = spaces.Box(
            low=0.0, high=50.0, shape=(1,), dtype=np.float32)
        # Observation Space
        self.observation_space = spaces.Box(
            low=0.0, high=150.0, shape=(2,), dtype=np.float32)

        self.sim = None
        self.current_step = 0

        self.active_anomaly_node = None
        self.current_scenario = "NORMAL"  # Changed from AMBIENT

    # --- PHYSICS HOOKS FOR MAIN.PY TO CALL ---

    def inject_rupture(self, target_id):
        """Physics: Punch a hole at the target"""
        self.active_anomaly_node = target_id
        self.current_scenario = "RUPTURE"

        if target_id in self.wn.link_name_list:
            # If pipe, leak the start node
            node_id = self.wn.get_link(target_id).start_node_name
            self.wn.get_node(node_id).add_leak(
                self.wn, area=0.05, start_time=self.current_step)
        else:
            self.wn.get_node(target_id).add_leak(
                self.wn, area=0.05, start_time=self.current_step)

    def inject_surge(self, target_id):
        """Physics: 10x Demand at target"""
        self.active_anomaly_node = target_id
        self.current_scenario = "SURGE"
        if target_id in self.wn.node_name_list:
            node = self.wn.get_node(target_id)
            node.demand_timeseries_list[0].base_value *= 10.0

    def inject_shortage(self):
        """Physics: Reservoir Pressure Drop"""
        res_name = self.wn.reservoir_name_list[0]
        self.wn.get_node(res_name).base_head *= 0.6
        self.active_anomaly_node = res_name
        self.current_scenario = "SHORTAGE"

    def apply_surgical_isolation(self, target_id):
        """Physics: Close the specific pipe/valves"""
        if target_id in self.wn.link_name_list:
            self.wn.get_link(target_id).status = 'CLOSED'
        elif target_id in self.wn.node_name_list:
            for link in self.wn.get_links_for_node(target_id):
                self.wn.get_link(link).status = 'CLOSED'

    def reset_to_normal(self):
        """Physics: Reload original network"""
        self.wn = wntr.network.WaterNetworkModel(self.network_file)
        self.active_anomaly_node = None
        self.current_scenario = "NORMAL"

    def apply_scenario(self):
        scenarios = ["Normal", "Leakage", "Shortage", "DemandSpike"]
        self.current_scenario = random.choice(scenarios)

        if self.current_scenario == "Leakage":
            node = self.wn.get_node(self.leak_node)
            node.add_leak(self.wn, area=0.05, start_time=2 *
                          3600, end_time=12*3600)
        elif self.current_scenario == "Shortage":
            tank = self.wn.get_node(self.tank_id)
            if hasattr(tank, 'base_head'):
                tank.base_head *= 0.7
            elif hasattr(tank, 'init_level'):
                tank.init_level *= 0.7
        elif self.current_scenario == "DemandSpike":
            house_b = self.wn.get_node(self.node_b)
            house_b.demand_timeseries_list[0].base_value *= 5.0

    def reset(self, seed=None, options=None, apply_anomaly=True):
        super().reset(seed=seed)

        # MEMORY OPTIMIZATION: Aggressive cleanup before loading new map
        if self.sim is not None:
            del self.sim
            del self.wn
            gc.collect()

        self.wn = wntr.network.WaterNetworkModel(self.network_file)
        if apply_anomaly:
            self.apply_scenario()
        else:
            self.current_scenario = "NORMAL"

        self.sim = wntr.sim.WNTRSimulator(self.wn)
        self.current_step = 0
        return np.array([50.0, 50.0], dtype=np.float32), {}

    def step(self, action):
        link = self.wn.get_link(self.ctrl_link)

        # PHYSICS OPTIMIZATION: Prevent the AI from choosing exactly 0.0
        # Shutting the system off completely breaks the hydraulic solver equations.
        safe_action = max(0.5, float(action[0]))

        try:
            link.initial_setting = safe_action
        except Exception:
            pass

        results = self.sim.run_sim(convergence_error=False)
        self.current_step += 3600

        try:
            pressure_A = results.node['pressure'].loc[self.current_step, self.node_a]
            pressure_B = results.node['pressure'].loc[self.current_step, self.node_b]
        except (KeyError, AttributeError):
            pressure_A, pressure_B = 0.0, 0.0

        observation = np.array([pressure_A, pressure_B], dtype=np.float32)

        # --- NEW PHASE 1: ISOLATION & ECONOMIC REWARD ---
        target_pressure = 20.0

        # 1. Stability Penalty (Keep the town pressurized)
        stability_penalty = abs(target_pressure - pressure_B)

        # 2. Economic Penalty (The Isolation Logic)
        try:
            # WNTR results.node['demand'] gives us the volume leaving Node B
            # Multiply by 1000 to convert m3/s to Liters/sec
            raw_flow_lps = results.node['demand'].loc[self.current_step,
                                                      self.node_b] * 1000

            # We subtract a tiny 'normal' demand (0.05) so it only penalizes the LEAK
            leak_rate_lps = max(0.0, raw_flow_lps - 0.05)
        except (KeyError, AttributeError):
            leak_rate_lps = 0.0

        # 3. The Smart Math
        # We give the leak a high weight (5.0).
        # This makes the AI realize that losing 1L of water is as 'painful' as being 5m off-pressure.
        leakage_penalty = leak_rate_lps * 5.0

        # Final combined reward
        raw_reward = -(stability_penalty + leakage_penalty)
        reward = float(np.clip(raw_reward, -100.0, 0.0))

        # 4. Info Update (Crucial for the React Dashboard later!)
        info = {
            "scenario": self.current_scenario,
            "node_b_pressure": pressure_B,
            "leak_rate_lps": float(leak_rate_lps)
        }
        terminated = self.current_step >= self.wn.options.time.duration
        truncated = False

        # MEMORY OPTIMIZATION: Destroy the massive physics dictionary immediately
        del results

        return observation, reward, terminated, truncated, info
