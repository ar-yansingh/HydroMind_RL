import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import GCNConv, global_mean_pool

# 1. The Topology Reader (Graph Neural Network)


class GraphFeatureExtractor(nn.Module):
    def __init__(self, num_node_features, hidden_dim):
        super(GraphFeatureExtractor, self).__init__()
        # GCN layers to pass pressure/demand info along the pipe edges
        self.conv1 = GCNConv(num_node_features, hidden_dim)
        self.conv2 = GCNConv(hidden_dim, hidden_dim)

    def forward(self, data):
        x, edge_index, batch = data.x, data.edge_index, data.batch

        # Message passing between connected nodes
        x = F.relu(self.conv1(x, edge_index))
        x = F.relu(self.conv2(x, edge_index))

        # If running a single environment step, create a dummy batch index
        if batch is None:
            batch = torch.zeros(x.size(0), dtype=torch.long, device=x.device)

        # Pool all node features into one single mathematical vector for the entire network
        x = global_mean_pool(x, batch)
        return x

# 2. The Actor (Decides the Valve Settings)


class Actor(nn.Module):
    def __init__(self, num_node_features, hidden_dim, action_dim, max_action):
        super(Actor, self).__init__()
        self.extractor = GraphFeatureExtractor(num_node_features, hidden_dim)

        self.fc1 = nn.Linear(hidden_dim, hidden_dim)
        self.fc2 = nn.Linear(hidden_dim, action_dim)
        self.max_action = max_action

    def forward(self, data):
        # Extract graph state
        x = self.extractor(data)

        x = F.relu(self.fc1(x))
        # Sigmoid outputs between 0 and 1, we scale it up to max valve setting (e.g., 50.0)
        x = torch.sigmoid(self.fc2(x)) * self.max_action
        return x

# 3. The Critic (Evaluates the Action)


class Critic(nn.Module):
    def __init__(self, num_node_features, hidden_dim, action_dim):
        super(Critic, self).__init__()
        self.extractor = GraphFeatureExtractor(num_node_features, hidden_dim)

        # Standard Q-network architecture taking in Graph Features + Action
        self.fc1 = nn.Linear(hidden_dim + action_dim, hidden_dim)
        self.fc2 = nn.Linear(hidden_dim, 1)

    def forward(self, data, action):
        # Extract graph state
        x = self.extractor(data)

        # Concatenate the network state summary with the chosen action
        xu = torch.cat([x, action], 1)

        x1 = F.relu(self.fc1(xu))
        q_value = self.fc2(x1)
        return q_value
