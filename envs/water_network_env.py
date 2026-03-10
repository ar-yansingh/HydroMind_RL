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
        self.current_scenario = "Normal"

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

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)

        # MEMORY OPTIMIZATION: Aggressive cleanup before loading new map
        if self.sim is not None:
            del self.sim
            del self.wn
            gc.collect()

        self.wn = wntr.network.WaterNetworkModel(self.network_file)
        self.apply_scenario()

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

        target_pressure = 20.0
        penalty = abs(target_pressure - pressure_B)

        # STABILITY FIX: Clip the penalty directly so it cannot fail
        reward = float(np.clip(-penalty, -50.0, 0.0))
        terminated = self.current_step >= self.wn.options.time.duration
        truncated = False

        info = {
            "scenario": self.current_scenario,
            "node_b_pressure": pressure_B
        }

        # MEMORY OPTIMIZATION: Destroy the massive physics dictionary immediately
        del results

        return observation, reward, terminated, truncated, info
