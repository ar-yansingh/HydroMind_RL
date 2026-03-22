import wntr
import json
import os

# 1. Path to your L-TOWN file
inp_file = 'data/networks/L-Town.inp'


def extract_topology():
    if not os.path.exists(inp_file):
        print(f"ERROR: Could not find network file at {inp_file}")
        return

    print(">>> Loading L-TOWN Network...")
    wn = wntr.network.WaterNetworkModel(inp_file)

    # --- Build adjacency for leaf-node detection ---
    node_degree = {}
    for name, link in wn.links():
        for nid in [link.start_node_name, link.end_node_name]:
            node_degree[nid] = node_degree.get(nid, 0) + 1

    # --- Source node sets ---
    reservoir_set = set(wn.reservoir_name_list)
    tank_set = set(wn.tank_name_list)
    source_set = reservoir_set | tank_set

    map_data = {"nodes": [], "links": []}

    # 2. Extract enriched node data
    for name, node in wn.nodes():
        # Classify node type
        if name in reservoir_set:
            ntype = "reservoir"
        elif name in tank_set:
            ntype = "tank"
        else:
            ntype = "junction"

        elevation = getattr(node, 'elevation', getattr(node, 'base_head', 0.0))
        base_demand = getattr(node, 'base_demand', 0.0)
        is_source = name in source_set
        is_leaf = (ntype == "junction") and (node_degree.get(name, 0) == 1)

        map_data["nodes"].append({
            "id": name,
            "x": node.coordinates[0],
            "y": node.coordinates[1],
            "type": ntype,
            "elevation": round(float(elevation), 2),
            "base_demand": round(float(base_demand), 5),
            "is_source": is_source,
            "is_leaf": is_leaf,
        })

    # 3. Extract enriched link (pipe) data
    for name, link in wn.links():
        length = getattr(link, 'length', 10.0)
        diameter = getattr(link, 'diameter', 0.3)

        # Determine link subtype
        link_type = "pipe"
        if name in wn.valve_name_list:
            link_type = "valve"
        elif name in wn.pump_name_list:
            link_type = "pump"

        map_data["links"].append({
            "id": name,
            "from": link.start_node_name,
            "to": link.end_node_name,
            "link_type": link_type,
            "length": round(float(length), 2),
            "diameter": round(float(diameter), 4),
        })

    # 4. Save the JSON file into React folder
    output_path = 'command-center/src/assets/map_topology.json'
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(map_data, f, indent=2)

    print(f">>> SUCCESS! Saved {len(map_data['nodes'])} nodes and {len(map_data['links'])} pipes.")
    print(f">>> File located at: {output_path}")

    # Stats
    sources = sum(1 for n in map_data['nodes'] if n['is_source'])
    leaves = sum(1 for n in map_data['nodes'] if n['is_leaf'])
    print(f">>> Sources: {sources} | Leaves: {leaves} | Valves: {sum(1 for l in map_data['links'] if l['link_type']=='valve')} | Pumps: {sum(1 for l in map_data['links'] if l['link_type']=='pump')}")


if __name__ == "__main__":
    extract_topology()
