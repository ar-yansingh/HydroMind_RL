import os
import json
import math
import random

# --- LOAD TOPOLOGY FOR PER-NODE STATE GENERATION ---
_topo_path = os.path.join(os.path.dirname(__file__), '..', '..', 'command-center', 'src', 'assets', 'map_topology.json')
_topology = {"nodes": [], "links": []}
if os.path.exists(_topo_path):
    with open(_topo_path) as f:
        _topology = json.load(f)
    print(f"Loaded topology: {len(_topology['nodes'])} nodes, {len(_topology['links'])} links")

# Build quick lookup
_node_lookup = {n["id"]: n for n in _topology["nodes"]}
_link_lookup = {l["id"]: l for l in _topology["links"]}

# Build adjacency list for BFS
_adj: dict[str, list[tuple[str, str]]] = {n["id"]: [] for n in _topology["nodes"]}
for _l in _topology["links"]:
    if _l["from"] in _adj and _l["to"] in _adj:
        _adj[_l["from"]].append((_l["to"], _l["id"]))
        _adj[_l["to"]].append((_l["from"], _l["id"]))
_sources = [n["id"] for n in _topology["nodes"] if n.get("is_source", False)]


def _resolve_targets_to_nodes(targets):
    """Convert a mixed list of node/link IDs to a set of affected node IDs."""
    resolved = set()
    for t in (targets or []):
        if t in _node_lookup:
            resolved.add(t)
        elif t in _link_lookup:
            link = _link_lookup[t]
            resolved.add(link["from"])
            resolved.add(link["to"])
    return resolved


def _get_network_reachability(closed_links, anomaly_targets, phase):
    """BFS from sources through open links. Returns (reachable_nodes, downstream_of_anomaly)."""
    reachable = set(_sources)
    queue = list(_sources)
    hop_dist: dict[str, int] = {n["id"]: 9999 for n in _topology["nodes"]}
    for s in _sources:
        hop_dist[s] = 0
        
    while queue:
        curr = queue.pop(0)
        d = hop_dist[curr]
        for nxt, lid in _adj.get(curr, []):
            if lid not in closed_links:
                if hop_dist[nxt] > d + 1:
                    hop_dist[nxt] = d + 1
                    if nxt not in reachable:
                        reachable.add(nxt)
                        queue.append(nxt)

    # Compute downstream set (nodes downstream of ALL anomaly targets)
    anomaly_nodes = _resolve_targets_to_nodes(anomaly_targets)
    downstream: set[str] = set()
    if phase in ["RUPTURE", "AI_RECOVERY"] and anomaly_nodes:
        dq = list(anomaly_nodes)
        downstream.update(anomaly_nodes)
            
        while dq:
            curr = dq.pop(0)
            d = hop_dist.get(curr, 0)
            for nxt, lid in _adj.get(curr, []):
                if lid not in closed_links and nxt not in downstream and hop_dist.get(nxt, 0) > d:
                    downstream.add(nxt)
                    dq.append(nxt)
    return reachable, downstream


def _generate_node_states(phase, step, reachable, downstream, anomaly_targets=None):
    """Generate synthetic per-node pressure/demand based on scenario.
    
    anomaly_targets: list of node/link IDs representing the anomaly epicentre(s).
    """
    anomaly_nodes = _resolve_targets_to_nodes(anomaly_targets)
    
    states = {}
    for node in _topology["nodes"]:
        nid = node["id"]
        elev = node.get("elevation", 50.0)
        base_demand = node.get("base_demand", 0.0)

        if nid not in reachable:
            states[nid] = {
                "pressure_m": 0.0,
                "demand_lps": 0.0,
            }
            continue

        pressure = max(4.0, 32.0 - (elev - 27.0) * 0.45)
        pressure += 0.8 * math.sin(step * 0.3 + hash(nid) % 100 * 0.1)
        pressure += random.uniform(-0.3, 0.3)

        demand_mult = 1.0  # default demand multiplier

        if phase == "RUPTURE" and anomaly_nodes:
            if nid in anomaly_nodes:
                pressure = max(0.0, pressure - 15.0)
            elif nid in downstream:
                pressure *= 0.2
            else:
                # Spatial proximity effect from ALL anomaly epicentres
                min_dist = _min_dist_to_targets(node, anomaly_nodes)
                if min_dist < 200:
                    pressure -= max(0.0, 8.0 - min_dist * 0.04)

        elif phase == "SURGE" and anomaly_nodes:
            # SURGE: demand spike at anomaly targets + spatial pressure drop
            if nid in anomaly_nodes:
                # Epicentre: massive demand spike, significant pressure drop
                pressure -= 12.0
                demand_mult = 4.0
            else:
                min_dist = _min_dist_to_targets(node, anomaly_nodes)
                if min_dist < 250:
                    # Nearby: proportional demand spike and pressure drop
                    intensity = max(0.0, 1.0 - (min_dist / 250.0))
                    pressure -= 10.0 * intensity
                    demand_mult = 1.0 + 3.0 * intensity

        elif phase == "SHORTAGE":
            pressure *= 0.65

        elif phase == "AI_RECOVERY":
            pressure += 2.0 * math.sin(step * 0.15)
            if nid in anomaly_nodes:
                pressure = 0.0  # Isolated rupture point
            elif nid in downstream:
                pressure = 0.0  # Downstream of isolated rupture

        pressure = max(0.0, round(pressure, 2))
        demand = round((base_demand * 1000 * demand_mult) + random.uniform(-0.005, 0.005), 4)
        demand = max(0.0, demand)

        states[nid] = {
            "pressure_m": pressure,
            "demand_lps": round(demand, 3),
        }
    return states


def _min_dist_to_targets(node, target_node_ids):
    """Compute minimum Euclidean distance from a node to any target node."""
    min_d = float('inf')
    for tid in target_node_ids:
        tn = _node_lookup.get(tid)
        if tn:
            d = math.sqrt((node["x"] - tn["x"])**2 + (node["y"] - tn["y"])**2)
            if d < min_d:
                min_d = d
    return min_d


def _generate_link_states(phase, step, closed_links, reachable, downstream, anomaly_targets=None):
    """Generate synthetic per-link flow/velocity based on scenario."""
    anomaly_nodes = _resolve_targets_to_nodes(anomaly_targets)
    anomaly_link_ids = set(t for t in (anomaly_targets or []) if t in _link_lookup)
    
    states = {}
    for link in _topology["links"]:
        lid = link["id"]
        
        if lid in closed_links or link["from"] not in reachable or link["to"] not in reachable:
            states[lid] = {
                "flow_lps": 0.0,
                "velocity_ms": 0.0,
            }
            continue

        diameter = link.get("diameter", 0.3)
        area = math.pi * (diameter / 2) ** 2
        base_flow = area * 1.2 * 1000  # L/s
        flow = base_flow + random.uniform(-0.05, 0.05)
        flow += 0.1 * math.sin(step * 0.2 + hash(lid) % 50 * 0.1)

        if phase == "RUPTURE" and anomaly_nodes:
            if lid in anomaly_link_ids:
                flow *= 0.1  # Near-zero flow through ruptured pipe
            elif link["from"] in downstream or link["to"] in downstream:
                flow *= 0.15
        elif phase == "SURGE" and anomaly_nodes:
            # Surge: increased flow near epicentre
            from_node = _node_lookup.get(link["from"])
            to_node = _node_lookup.get(link["to"])
            if from_node and to_node:
                if link["from"] in anomaly_nodes or link["to"] in anomaly_nodes:
                    flow *= 2.5  # High flow at surge epicentre
                else:
                    avg_x = (from_node["x"] + to_node["x"]) / 2
                    avg_y = (from_node["y"] + to_node["y"]) / 2
                    min_dist = float('inf')
                    for tid in anomaly_nodes:
                        tn = _node_lookup.get(tid)
                        if tn:
                            d = math.sqrt((avg_x - tn["x"])**2 + (avg_y - tn["y"])**2)
                            if d < min_dist:
                                min_dist = d
                    if min_dist < 250:
                        intensity = max(0.0, 1.0 - (min_dist / 250.0))
                        flow *= (1.0 + 1.5 * intensity)
        elif phase == "SHORTAGE":
            flow *= 0.5
        elif phase == "AI_RECOVERY" and anomaly_nodes:
            if link["from"] in downstream or link["to"] in downstream:
                flow = 0.0
            elif lid in anomaly_link_ids or link["from"] in anomaly_nodes or link["to"] in anomaly_nodes:
                flow = 0.0

        flow = max(0.0, round(flow, 3))
        velocity = round(flow / (area * 1000) if area > 0 else 0.0, 2)

        states[lid] = {
            "flow_lps": flow,
            "velocity_ms": velocity,
        }
    return states
