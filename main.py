import torch
import torch.nn.functional as F
import torch.optim as optim
import copy
import numpy as np
import matplotlib.pyplot as plt
import os
import wntr
import random
import gymnasium as gym
from gymnasium import spaces

from utils.graph_builder import network_to_graph
from models.ddpg_agent import Actor, Critic
from utils.replay_buffer import GraphReplayBuffer

# =====================================================================
# SURROGATE DIGITAL TWIN ENVIRONMENT (BYPASSES WNTR CRASHES)
# =====================================================================


class AquaFlowEnv(gym.Env):
    def __init__(self, network_file='data/networks/L-Town.inp'):
        super(AquaFlowEnv, self).__init__()
        self.network_file = network_file
        # We still load the network so your Graph Neural Network has the real map!
        self.wn = wntr.network.WaterNetworkModel(self.network_file)

        self.node_a = self.wn.junction_name_list[0]
        self.node_b = self.wn.junction_name_list[-1]

        self.action_space = spaces.Box(
            low=0.0, high=50.0, shape=(1,), dtype=np.float32)
        self.observation_space = spaces.Box(
            low=0.0, high=150.0, shape=(2,), dtype=np.float32)

        self.current_step = 0
        self.current_scenario = "Normal"

    def inject_rupture(self, target_id):
        self.current_scenario = "Leakage"

    def inject_surge(self, target_id):
        self.current_scenario = "DemandSpike"

    def reset_to_normal(self):
        self.current_scenario = "Normal"

    def inject_shortage(self):
        self.current_scenario = "Shortage"

    def reset(self, seed=None, options=None, apply_anomaly=True):
        super().reset(seed=seed)
        scenarios = ["Normal", "Leakage", "Shortage", "DemandSpike"]
        self.current_scenario = random.choice(scenarios)
        self.current_step = 0
        return np.array([45.0, 15.0], dtype=np.float32), {}

    def step(self, action):
        self.current_step += 3600
        action_val = float(np.clip(action[0], 0.0, 50.0))

        # --- THE SURROGATE PHYSICS ENGINE ---
        # Instead of crashing WNTR, we calculate realistic pressure mathematically
        base_pressure = 10.0
        valve_contribution = action_val * 0.4  # AI action translates to pressure

        scenario_drop = 0.0
        if self.current_scenario == "Leakage":
            scenario_drop = 12.0
        elif self.current_scenario == "DemandSpike":
            scenario_drop = 8.0
        elif self.current_scenario == "Shortage":
            scenario_drop = 5.0

        pressure_B = base_pressure + valve_contribution - scenario_drop
        pressure_B += random.uniform(-0.5, 0.5)  # Add realistic sensor noise
        pressure_B = max(0.0, pressure_B)

        pressure_A = 45.0 if self.current_scenario != "Shortage" else 30.0

        observation = np.array([pressure_A, pressure_B], dtype=np.float32)

        target_pressure = 20.0
        penalty = abs(target_pressure - pressure_B)
        reward = float(np.clip(-penalty, -50.0, 0.0))

        terminated = self.current_step >= (12 * 3600)
        truncated = False
        info = {"scenario": self.current_scenario,
                "node_b_pressure": pressure_B}

        return observation, reward, terminated, truncated, info

# =====================================================================
# MASTER TRAINING LOOP
# =====================================================================


def train_aquaflow():
    print("Initializing Surrogate Digital Twin Environment...")
    env = AquaFlowEnv()

    def trigger_rupture(target_id):
        global env
        env.inject_rupture(target_id)

    def trigger_surge(target_id):
        global env
        env.inject_surge(target_id)

    def reset_scenarios():
        global env
        env.reset_to_normal()
    num_episodes = 30
    batch_size = 32
    max_action = 50.0
    gamma = 0.99
    tau = 0.005

    actor = Actor(num_node_features=3, hidden_dim=64,
                  action_dim=1, max_action=max_action)
    critic = Critic(num_node_features=3, hidden_dim=64, action_dim=1)

    actor_target = copy.deepcopy(actor)
    critic_target = copy.deepcopy(critic)
    actor_optimizer = optim.Adam(actor.parameters(), lr=1e-4)
    critic_optimizer = optim.Adam(critic.parameters(), lr=1e-3)
    # --- PHASE 1: LOAD & FINE-TUNE FOR ISOLATION ---
    import os
    import torch

    actor_path = 'models/checkpoints/actor_final.pth'
    critic_path = 'models/checkpoints/critic_final.pth'

    if os.path.exists(actor_path):
        print(
            f">>> [PHASE 1] Loading pre-trained weights from {actor_path}...")
        actor.load_state_dict(torch.load(actor_path))
        critic.load_state_dict(torch.load(critic_path))

        # Sync the target networks so they start with the loaded knowledge
        actor_target = copy.deepcopy(actor)
        critic_target = copy.deepcopy(critic)

        # THE FINE-TUNING HACK: Force the optimizers to be 10x slower
        # This ensures the AI doesn't 'panic' when it sees the new leak penalty
        for param_group in actor_optimizer.param_groups:
            param_group['lr'] = 1e-5
        for param_group in critic_optimizer.param_groups:
            param_group['lr'] = 1e-4
        print(
            ">>> [PHASE 1] Weights loaded. Optimizers tuned for Isolation Strategy.")
    else:
        print(
            ">>> [PHASE 1] No weights found at the checkpoint path. Starting fresh.")

    memory = GraphReplayBuffer(max_size=2000)
    reward_history = []

    print("Starting Accelerated Training Loop...\n")

    for episode in range(num_episodes):
        obs_array, _ = env.reset()
        state_graph = network_to_graph(env.wn, current_pressures={
                                       env.node_a: obs_array[0], env.node_b: obs_array[1]})

        episode_reward = 0
        done = False

        while not done:
            with torch.no_grad():
                action_tensor = actor(state_graph)

            noise_scale = max(0.1, 5.0 * (1.0 - (episode / num_episodes)))
            action_value = action_tensor.item() + np.random.normal(0, noise_scale)
            action_value = np.clip(action_value, 0.0, max_action)
            action = [action_value]

            next_obs_array, reward, terminated, truncated, info = env.step(
                action)
            done = terminated or truncated

            next_state_graph = network_to_graph(env.wn, current_pressures={
                                                env.node_a: next_obs_array[0], env.node_b: next_obs_array[1]})
            memory.add(state_graph, action, reward, next_state_graph, done)
            state_graph = next_state_graph
            episode_reward += reward

            if len(memory) > batch_size:
                batch_states, batch_actions, batch_rewards, batch_next_states, batch_dones = memory.sample(
                    batch_size)

                with torch.no_grad():
                    next_actions = actor_target(batch_next_states)
                    target_Q = critic_target(batch_next_states, next_actions)
                    target_Q = batch_rewards + \
                        (gamma * target_Q * (1 - batch_dones))

                current_Q = critic(batch_states, batch_actions)
                critic_loss = F.mse_loss(current_Q, target_Q)
                critic_optimizer.zero_grad()
                critic_loss.backward()
                critic_optimizer.step()

                actor_loss = -critic(batch_states, actor(batch_states)).mean()
                actor_optimizer.zero_grad()
                actor_loss.backward()
                actor_optimizer.step()

                for param, target_param in zip(critic.parameters(), critic_target.parameters()):
                    target_param.data.copy_(
                        tau * param.data + (1 - tau) * target_param.data)
                for param, target_param in zip(actor.parameters(), actor_target.parameters()):
                    target_param.data.copy_(
                        tau * param.data + (1 - tau) * target_param.data)

        reward_history.append(episode_reward)
        recent_avg = np.mean(
            reward_history[-10:]) if len(reward_history) >= 10 else np.mean(reward_history)
        print(
            f"Ep {episode + 1:>3}/{num_episodes} | Scenario: {info['scenario']:<12} | Tail Pressure: {info['node_b_pressure']:>5.1f}m | Reward: {episode_reward:>7.1f} | 10-Ep Avg: {recent_avg:>7.1f}")

    print("\nTraining Complete! Saving model and generating graph...")
    os.makedirs('models/checkpoints', exist_ok=True)
    torch.save(actor.state_dict(), 'models/checkpoints/actor_final.pth')
    torch.save(critic.state_dict(), 'models/checkpoints/critic_final.pth')

    plt.figure(figsize=(10, 5))
    plt.plot(reward_history, color='#0078D4',
             alpha=0.3, label='Episode Reward')
    if len(reward_history) >= 10:
        smoothed = np.convolve(reward_history, np.ones(10)/10, mode='valid')
        plt.plot(range(9, len(reward_history)), smoothed,
                 color='#004578', linewidth=2, label='10-Episode Moving Avg')

    plt.title('AquaFlow RL: DDPG Learning Curve (Surrogate Digital Twin)')
    plt.xlabel('Episode')
    plt.ylabel('Total Reward')
    plt.legend()
    plt.grid(True, linestyle='--', alpha=0.7)
    plt.savefig('learning_curve.png')
    print("Graph saved as learning_curve.png!")


if __name__ == "__main__":
    train_aquaflow()

# --- AT THE VERY BOTTOM OF main.py (Left Margin) ---

# 1. Create a global variable for the environment
env = None


def start_training():
    global env
    print("Initializing Surrogate Digital Twin Environment...")
    env = AquaFlowEnv()
    # ... call your actual training logic here ...

# 2. These functions MUST be at the left margin to be importable


def trigger_rupture(target_id):
    if env:
        env.inject_rupture(target_id)


def trigger_surge(target_id):
    if env:
        env.inject_surge(target_id)


def trigger_shortage():
    if env:
        env.inject_shortage()


def reset_scenarios():
    if env:
        env.reset_to_normal()
