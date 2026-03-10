import torch
from torch_geometric.data import Data
import wntr


def network_to_graph(wn: wntr.network.WaterNetworkModel, current_pressures=None):
    """
    Converts a WNTR water network into a PyTorch Geometric Data object.
    """
    # 1. Map node names to integer indices (PyTorch requires numbers, not string names)
    node_names = list(wn.node_name_list)
    name_to_id = {name: i for i, name in enumerate(node_names)}

    # 2. Extract Node Features (The 'x' matrix)
    # We will use Elevation and Base Demand as static features.
    # If a simulation is running, we also append the current live pressure.
    node_features = []
    for name in node_names:
        node = wn.get_node(name)

        # Safe extraction of elevation and demand (tanks/reservoirs might not have base_demand)
        elevation = getattr(node, 'elevation', getattr(node, 'base_head', 0.0))
        base_demand = getattr(node, 'base_demand', 0.0)

        # Add live pressure if provided, otherwise default to 0
        pressure = current_pressures[name] if current_pressures and name in current_pressures else 0.0

        node_features.append([elevation, base_demand, pressure])

    x = torch.tensor(node_features, dtype=torch.float)

    # 3. Extract Edges (The 'edge_index' matrix) and Edge Features (The 'edge_attr' matrix)
    edge_indices = []
    edge_features = []

    for link_name, link in wn.links():
        start_id = name_to_id[link.start_node_name]
        end_id = name_to_id[link.end_node_name]

        # PyTorch Geometric expects edges in format [2, num_edges]
        edge_indices.append([start_id, end_id])

        # For undirected flow (water can flow both ways), add the reverse edge too
        edge_indices.append([end_id, start_id])

        # Extract link properties (Pipes have length/diameter, Valves/Pumps have different properties)
        # Default to 10m if it's a valve
        length = getattr(link, 'length', 10.0)
        diameter = getattr(link, 'diameter', 0.3)

        # Append features for both flow directions
        edge_features.append([length, diameter])
        edge_features.append([length, diameter])

    # Convert to PyTorch tensors
    edge_index = torch.tensor(edge_indices, dtype=torch.long).t().contiguous()
    edge_attr = torch.tensor(edge_features, dtype=torch.float)

    # 4. Construct and return the PyTorch Geometric Graph object
    graph_data = Data(x=x, edge_index=edge_index, edge_attr=edge_attr)

    return graph_data
