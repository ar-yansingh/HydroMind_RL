import torch
from torch_geometric.data import Data

def run_gnn_inference(actor, state):
    """
    Format the raw environment state into a PyTorch Geometric
    Data object and run the Actor GNN for an isolation action.
    """
    with torch.no_grad():
        raw_obs = torch.FloatTensor(state).view(2, 1)
        padding = torch.zeros((2, 2))
        x = torch.cat([raw_obs, padding], dim=1)
        
        edge_index = torch.tensor([[0, 1], [1, 0]], dtype=torch.long)
        batch = torch.tensor([0, 0], dtype=torch.long)
        
        data_object = Data(x=x, edge_index=edge_index, batch=batch)
        ai_action = actor(data_object)
        
        return ai_action.cpu().numpy().flatten()
