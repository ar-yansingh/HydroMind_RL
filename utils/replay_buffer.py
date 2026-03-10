import random
from collections import deque
import torch
from torch_geometric.data import Batch


class GraphReplayBuffer:
    def __init__(self, max_size=10000):
        # A deque automatically removes the oldest memories when it reaches max_size
        self.buffer = deque(maxlen=max_size)

    def add(self, state_graph, action, reward, next_state_graph, done):
        """Stores a single transition in the memory bank."""
        self.buffer.append(
            (state_graph, action, reward, next_state_graph, done))

    def sample(self, batch_size):
        """Randomly samples a batch of experiences to train on."""
        batch = random.sample(self.buffer, batch_size)
        state_graphs, actions, rewards, next_state_graphs, dones = zip(*batch)

        # Crucial Step: PyTorch Geometric requires 'Batch.from_data_list'
        # to correctly stitch multiple individual graphs into one giant disconnected graph for the GPU
        batch_states = Batch.from_data_list(state_graphs)
        batch_next_states = Batch.from_data_list(next_state_graphs)

        # Convert the rest to standard PyTorch tensors
        batch_actions = torch.tensor(actions, dtype=torch.float32)
        batch_rewards = torch.tensor(rewards, dtype=torch.float32).unsqueeze(1)
        batch_dones = torch.tensor(dones, dtype=torch.float32).unsqueeze(1)

        return batch_states, batch_actions, batch_rewards, batch_next_states, batch_dones

    def __len__(self):
        return len(self.buffer)
