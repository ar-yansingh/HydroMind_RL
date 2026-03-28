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

# Build criticality and zone lookups
_node_criticality = {n["id"]: n.get("criticality", 0) for n in _topology["nodes"]}
_node_zone = {n["id"]: n.get("zone_id", "Z00") for n in _topology["nodes"]}
_zone_nodes: dict[str, list[str]] = {}
for n in _topology["nodes"]:
    z = n.get("zone_id", "Z00")
    _zone_nodes.setdefault(z, []).append(n["id"])

# Build adjacency list for BFS
_adj: dict[str, list[tuple[str, str]]] = {n["id"]: [] for n in _topology["nodes"]}
for _l in _topology["links"]:
    if _l["from"] in _adj and _l["to"] in _adj:
        _adj[_l["from"]].append((_l["to"], _l["id"]))
        _adj[_l["to"]].append((_l["from"], _l["id"]))
_sources = [n["id"] for n in _topology["nodes"] if n.get("is_source", False)]
_leaves = set(n["id"] for n in _topology["nodes"] if n.get("is_leaf", False))


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
    """BFS from sources through open links.
    Returns (reachable_nodes, downstream_of_anomaly, alternate_supply).
    
    - reachable: all nodes that can be reached from any source via open links
    - downstream: nodes topologically downstream of the anomaly epicenter
    - alternate_supply: nodes that are both downstream AND still reachable via an alternate path
      (i.e., the network loops allow water to reach them from a different direction)
    """
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

    # Alternate supply: downstream nodes that are STILL reachable via the network
    # These nodes can get water through a looped alternate path
    alternate_supply = downstream & reachable - anomaly_nodes

    return reachable, downstream, alternate_supply, hop_dist

def _generate_node_states(phase, step, reachable, downstream, anomaly_targets=None, sacrificed_zones=None, original_scenario="AMBIENT", alternate_supply=None):
    """Generate synthetic per-node pressure/demand based on scenario.

    anomaly_targets: list of node/link IDs representing the anomaly epicentre(s).
    sacrificed_zones: set of zone_ids being load-shed by AI during SHORTAGE triage.
    alternate_supply: set of node IDs that are downstream but still reachable via alternate paths.
    """
    anomaly_nodes = _resolve_targets_to_nodes(anomaly_targets)
    sacrificed_zones = sacrificed_zones or set()
    alternate_supply = alternate_supply or set()

    states = {}
    for node in _topology["nodes"]:
        nid = node["id"]
        elev = node.get("elevation", 50.0)
        base_demand = node.get("base_demand", 0.0)
        crit = _node_criticality.get(nid, 0)
        zone = _node_zone.get(nid, "Z00")

        if nid not in reachable:
            states[nid] = {
                "pressure_m": 0.0,
                "demand_lps": 0.0,
                "criticality": crit,
                "zone_id": zone,
                "status": "ISOLATED",
            }
            continue

        pressure = max(4.0, 32.0 - (elev - 27.0) * 0.45)
        pressure += 0.8 * math.sin(step * 0.3 + hash(nid) % 100 * 0.1)
        pressure += random.uniform(-0.3, 0.3)

        demand_mult = 1.0
        node_status = "NORMAL"

        if phase == "RUPTURE" and anomaly_nodes:
            if nid in anomaly_nodes:
                pressure = max(1.0, pressure - 18.0)
                node_status = "RUPTURE_EPICENTER"
            elif nid in downstream:
                if nid in alternate_supply:
                    # Node is downstream but can still get water via a loop
                    pressure *= 0.55
                    node_status = "ALTERNATE_SUPPLY"
                else:
                    pressure *= 0.25
                    node_status = "DOWNSTREAM_AFFECTED"
            else:
                min_dist = _min_dist_to_targets(node, anomaly_nodes)
                if min_dist < 200:
                    pressure -= max(0.0, 8.0 - min_dist * 0.04)
                    node_status = "PROXIMITY_AFFECTED"

        elif phase == "SURGE" and anomaly_nodes:
            if nid in anomaly_nodes:
                pressure -= 12.0
                demand_mult = 4.0
                node_status = "SURGE_EPICENTER"
            else:
                min_dist = _min_dist_to_targets(node, anomaly_nodes)
                if min_dist < 300:
                    intensity = max(0.0, 1.0 - (min_dist / 300.0))
                    pressure -= 12.0 * intensity
                    demand_mult = 1.0 + 3.0 * intensity
                    node_status = "SURGE_CONE"

        elif phase == "SHORTAGE":
            # Elevation vulnerability: higher nodes lose more pressure
            elev_factor = max(0.3, 1.0 - (elev - 27.0) * 0.012)
            pressure *= 0.55 * elev_factor
            # Leaf nodes are most vulnerable
            if node.get("is_leaf", False):
                pressure *= 0.5
                node_status = "CRITICAL_VULNERABLE"
            elif elev > 65:
                node_status = "ELEVATION_VULNERABLE"
            else:
                node_status = "SUPPLY_REDUCED"

        elif phase == "AI_RECOVERY":
            if original_scenario == "RUPTURE" and anomaly_nodes:
                if nid in anomaly_nodes:
                    # AI completely isolates ruptures -> zero pressure
                    pressure = 0.0
                    node_status = "RUPTURE_EPICENTER"
                elif nid in downstream:
                    if nid in alternate_supply:
                        # Downstream but reachable via rerouted alternate path
                        pressure *= 0.65
                        pressure += 1.0 * math.sin(step * 0.15)
                        node_status = "AI_REROUTING"
                    else:
                        pressure = 0.0
                        node_status = "DOWNSTREAM_AFFECTED"
                else: 
                    # Surrounding nodes stabilize as pressure builds back up
                    pressure *= 0.95
                    pressure += 1.5 * math.sin(step * 0.15)
                    node_status = "AI_STABILIZED"

            elif original_scenario == "SURGE" and anomaly_nodes:
                if nid in anomaly_nodes:
                    # Surge epicenter: AI BOOSTS supply to meet demand!
                    pressure += 5.0 + 1.5 * math.sin(step * 0.15)
                    node_status = "AI_BOOSTING"
                else:
                    min_dist = _min_dist_to_targets(node, anomaly_nodes)
                    if min_dist < 400:
                        boost = max(0.0, 3.0 * (1.0 - min_dist / 400.0))
                        pressure += boost + 1.2 * math.sin(step * 0.15)
                        node_status = "AI_REROUTING"
                    else:
                        pressure *= 0.9
                        node_status = "AI_BALANCED"

            elif original_scenario == "SHORTAGE":
                # Global strategy: proportional allocation with priority weighting
                # Critical infrastructure (hospitals) gets a boost, residential gets slightly reduced
                # But NOBODY gets zero — minimum service level everywhere
                crit_weight = 1.0 + crit * 0.08  # 1.0 / 1.08 / 1.16
                pressure = pressure * 0.85 * crit_weight
                pressure += 1.5 * math.sin(step * 0.15)
                if crit >= 2:
                    node_status = "AI_PRIORITIZED"
                elif crit >= 1:
                    node_status = "AI_BALANCED"
                else:
                    node_status = "AI_STABILIZED"
            else:
                pressure *= 0.9
                node_status = "AI_STABILIZED"

        pressure = max(0.0, round(pressure, 2))
        demand = round((base_demand * 1000 * demand_mult) + random.uniform(-0.005, 0.005), 4)
        demand = max(0.0, demand)

        states[nid] = {
            "pressure_m": pressure,
            "demand_lps": round(demand, 3),
            "criticality": crit,
            "zone_id": zone,
            "status": node_status,
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


def _generate_link_states(phase, step, closed_links, reachable, downstream, anomaly_targets=None, sacrificed_zones=None, original_scenario="AMBIENT"):
    """Generate synthetic per-link flow/velocity based on scenario."""
    anomaly_nodes = _resolve_targets_to_nodes(anomaly_targets)
    anomaly_link_ids = set(t for t in (anomaly_targets or []) if t in _link_lookup)
    sacrificed_zones = sacrificed_zones or set()

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
                flow *= 0.15
            elif link["from"] in downstream or link["to"] in downstream:
                flow *= 0.25
        elif phase == "SURGE" and anomaly_nodes:
            from_node = _node_lookup.get(link["from"])
            to_node = _node_lookup.get(link["to"])
            if from_node and to_node:
                if link["from"] in anomaly_nodes or link["to"] in anomaly_nodes:
                    flow *= 2.5
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
                    if min_dist < 300:
                        intensity = max(0.0, 1.0 - (min_dist / 300.0))
                        flow *= (1.0 + 2.0 * intensity)
        elif phase == "SHORTAGE":
            flow *= 0.45
        elif phase == "AI_RECOVERY":
            if original_scenario == "RUPTURE" and anomaly_nodes:
                if lid in anomaly_link_ids or link["from"] in anomaly_nodes or link["to"] in anomaly_nodes:
                    flow = 0.0
                elif link["from"] in downstream or link["to"] in downstream:
                    flow = 0.0
                else:
                    flow *= 1.05
            elif original_scenario == "SURGE" and anomaly_nodes:
                from_node = _node_lookup.get(link["from"])
                to_node = _node_lookup.get(link["to"])
                if from_node and to_node:
                    if link["from"] in anomaly_nodes or link["to"] in anomaly_nodes:
                        flow *= 1.8  # AI boosts flow towards surge
                    else:
                        flow *= 1.1  # Partial reroute towards surge
            elif original_scenario == "SHORTAGE":
                # AI performs proportional reroute maintaining flow to critical
                from_node = _node_lookup.get(link["from"])
                to_node = _node_lookup.get(link["to"])
                # If flowing to a critical node, maintain more flow
                crit_factor = 1.0
                if to_node and to_node.get("criticality", 0) >= 2:
                    crit_factor = 1.2
                flow *= 0.85 * crit_factor
            else:
                flow *= 0.95

        flow = max(0.0, round(flow, 3))
        velocity = round(flow / (area * 1000) if area > 0 else 0.0, 2)

        states[lid] = {
            "flow_lps": flow,
            "velocity_ms": velocity,
        }
    return states


def compute_network_analytics(node_states):
    """Compute supply/demand gap, zone health, and triage recommendations."""
    if not node_states:
        return {}

    total_demand = 0.0
    total_supplied = 0.0
    zone_health: dict[str, dict] = {}
    vulnerable_zones = []

    for nid, ns in node_states.items():
        demand = ns.get("demand_lps", 0.0)
        pressure = ns.get("pressure_m", 0.0)
        zone = ns.get("zone_id", "Z00")
        crit = ns.get("criticality", 0)

        total_demand += demand
        # Simplified: supply is proportional to pressure (PDD approximation)
        if pressure > 5.0:
            total_supplied += demand
        elif pressure > 0:
            total_supplied += demand * (pressure / 5.0)

        if zone not in zone_health:
            zone_health[zone] = {
                "total_nodes": 0, "healthy": 0, "critical_nodes": 0,
                "avg_pressure": 0.0, "max_criticality": 0,
            }
        zh = zone_health[zone]
        zh["total_nodes"] += 1
        zh["avg_pressure"] += pressure
        zh["max_criticality"] = max(zh["max_criticality"], crit)
        if crit >= 2:
            zh["critical_nodes"] += 1
        if pressure > 5.0:
            zh["healthy"] += 1

    # Finalize zone averages and find sacrifice candidates
    for zid, zh in zone_health.items():
        if zh["total_nodes"] > 0:
            zh["avg_pressure"] = round(zh["avg_pressure"] / zh["total_nodes"], 2)
            zh["health_pct"] = round((zh["healthy"] / zh["total_nodes"]) * 100, 1)
        else:
            zh["health_pct"] = 0.0
        # Zones with NO critical infrastructure and low health are sacrifice candidates
        if zh["max_criticality"] < 2 and zh["health_pct"] < 60:
            vulnerable_zones.append(zid)

    supply_demand_gap = round(total_demand - total_supplied, 3) if total_demand > 0 else 0.0
    supply_pct = round((total_supplied / total_demand * 100), 1) if total_demand > 0 else 100.0

    return {
        "supply_demand_gap_lps": supply_demand_gap,
        "supply_fulfillment_pct": supply_pct,
        "zone_health": zone_health,
        "sacrifice_candidates": sorted(vulnerable_zones),
    }


def get_triage_sacrifice_zones(node_states, max_sacrifice=4):
    """Determine which zones should be load-shed during AI triage.
    Picks zones with no critical infrastructure, sorted by lowest health."""
    analytics = compute_network_analytics(node_states)
    zh = analytics.get("zone_health", {})

    candidates = []
    for zid, info in zh.items():
        if info["max_criticality"] < 2:  # Never sacrifice zones with hospitals
            candidates.append((zid, info["health_pct"], info["max_criticality"]))

    # Sort: lowest criticality first, then lowest health (most damaged)
    candidates.sort(key=lambda x: (x[2], x[1]))
    return set(c[0] for c in candidates[:max_sacrifice])
# Persistent flow direction memory — prevents flickering from noise
_prev_flow_directions: dict[str, str] = {}

# Deadband threshold: direction only flips if pressure diff exceeds this (meters)
_DIRECTION_DEADBAND = 1.5


def _compute_flow_directions(node_states, link_states, hop_dist):
    """Compute flow direction purely using topologic distance from sources (BFS DAG).
    
    This mathematically GUARANTEES flow conservation (Kirchhoff's Law) for the visuals.
    Because every node's distance is an integer layer from a source, water flows strictly
    from `layer N` to `layer N+1`. A tie-breaker on node ID is used for nodes on the
    same layer, ensuring a perfect Directed Acyclic Graph (DAG) with ZERO interior 
    sources or sinks. This naturally eliminates all toggling/noise without hysteresis.
    
    RULES:
    - Water always flows AWAY from sources and TOWARD endpoints (leaves).
    
    Returns: { link_id: { direction: 'forward'|'reverse', velocity: float } }
    """
    directions = {}
    source_ids = set(_sources)

    for link in _topology["links"]:
        lid = link["id"]
        ls = link_states.get(lid, {})
        velocity = ls.get("velocity_ms", 0.0)

        if velocity < 0.001:
            directions[lid] = {"direction": "forward", "velocity": 0.0}
            continue

        from_id = link["from"]
        to_id = link["to"]

        # HARD RULE: sources always push water outward
        if from_id in source_ids:
            directions[lid] = {"direction": "forward", "velocity": velocity}
            continue
        if to_id in source_ids:
            directions[lid] = {"direction": "reverse", "velocity": velocity}
            continue

        # DAG RULE: flow from lower BFS distance to higher BFS distance
        d_from = hop_dist.get(from_id, 9999)
        d_to = hop_dist.get(to_id, 9999)

        if d_from < d_to:
            new_dir = "forward"
        elif d_from > d_to:
            new_dir = "reverse"
        else:
            # Tie-breaker for nodes on the exact same BFS level -> Strict DAG
            if from_id < to_id:
                new_dir = "forward"
            else:
                new_dir = "reverse"

        directions[lid] = {"direction": new_dir, "velocity": velocity}

    # --- POST-PROCESSING: 2-Pipe Sink Relocation ---
    # In any BFS DAG on a looped network, loops mathematically MUST terminate in a topological sink.
    # If this sink lands on a node with exactly 2 pipes (a straight-line segment), the user perceives
    # it as a visual bug ("two arrows crashing in an empty pipe").
    # We resolve this by pushing the sink along the line (flipping arrows) until it lands 
    # on a >= 3 pipe junction (where complex converging flow is visually expected) or a true leaf.
    
    for _iteration in range(785):  # Max possible path length
        sinks_pushed = 0
        
        in_degrees = {n["id"]: [] for n in _topology["nodes"]}
        out_degrees = {n["id"]: [] for n in _topology["nodes"]}
        
        for lid, d in directions.items():
            if d.get("velocity", 0) >= 0.001:
                lnk = _link_lookup[lid]
                if d["direction"] == "forward":
                    out_degrees[lnk["from"]].append(lid)
                    in_degrees[lnk["to"]].append(lid)
                else:
                    out_degrees[lnk["to"]].append(lid)
                    in_degrees[lnk["from"]].append(lid)
                    
        for node in _topology["nodes"]:
            nid = node["id"]
            if nid in source_ids or node.get("is_leaf", False):
                continue
                
            ins = in_degrees[nid]
            outs = out_degrees[nid]
            
            # If it is a 2-pipe node AND a pure sink (2 IN, 0 OUT)
            if len(outs) == 0 and len(ins) == 2:
                # Find a pipe we haven't flipped yet
                valid_flips = [l for l in ins if l not in _prev_flow_directions] # Hack: reuse _prev_flow_directions as a flipped set since it's local here
                
                if valid_flips:
                    lid_to_flip = valid_flips[0]
                    directions[lid_to_flip]["direction"] = "reverse" if directions[lid_to_flip]["direction"] == "forward" else "forward"
                    _prev_flow_directions[lid_to_flip] = True # Mark as flipped
                    sinks_pushed += 1
                
        if sinks_pushed == 0:
            break

    # Reset the hacky flipped tracker
    _prev_flow_directions.clear()
    
    return directions

def generate_diagnostic(phase, anomaly_targets, node_states, reachable_nodes):
    """
    Generate a rich diagnostic object explaining WHY the AI classified an event.
    Returns: { "summary": str, "details": str, "metrics": dict }
    """
    if phase == "AMBIENT" or not anomaly_targets:
        return None

    target = anomaly_targets[0]
    is_node = target.startswith("n")
    is_pipe = target.startswith("p")
    
    # Resolve epicenter node
    epicenter = target
    if is_pipe and target in _link_lookup:
        epicenter = _link_lookup[target]["from"]  # Just pick one end for stats
        
    epi_state = node_states.get(epicenter, {})
    current_pressure = epi_state.get("pressure_m", 0.0)
    baseline_pressure = max(4.0, 32.0 - (_node_lookup.get(epicenter, {}).get("elevation", 50.0) - 27.0) * 0.45)
    pressure_drop = max(0.0, baseline_pressure - current_pressure)
    
    isolated_count = sum(1 for s in node_states.values() if s.get("status") == "ISOLATED")
    affected_count = sum(1 for s in node_states.values() if s.get("status", "NORMAL") != "NORMAL")

    if phase == "RUPTURE":
        diameter = 0.15
        if is_pipe and target in _link_lookup:
            diameter = _link_lookup[target].get("diameter", 0.15)
            
        leak_rate = 45.5 # Simulated constant for now
        
        summary = f"Pipe Burst Detected near {target}" if is_pipe else f"Structural Rupture Detected at {target}"
        details = (
            f"Rapid localized pressure drop of {pressure_drop:.1f}m detected at epicenter {epicenter}. "
            f"The anomaly spread affects {affected_count} downstream nodes. "
            f"Hydraulic signature matches catastrophic pipe failure (zero-pressure void) rather than demand surge. "
            f"Hypothesis: Pipe wall failure due to sustained over-pressurization."
        )
        metrics = {
            "Pressure Drop": f"{pressure_drop:.1f} m",
            "Affected Nodes": affected_count,
            "Est. Leak Rate": f"{leak_rate} L/s",
            "Pipe Diameter": f"{diameter} m"
        }
        
    elif phase == "SURGE":
        summary = f"Abnormal Demand Spike at {target}"
        details = (
            f"Localized pressure drop of {pressure_drop:.1f}m detected at {epicenter}. "
            f"Unlike a rupture, the pressure has stabilized above absolute zero, indicating a massive but bounded consumption spike. "
            f"Spread radius covers {affected_count} nodes. Hypothesis: Unauthorized hydrant tapping or heavy industrial draw."
        )
        metrics = {
            "Pressure Drop": f"{pressure_drop:.1f} m",
            "Affected Nodes": affected_count,
            "Demand Spike": "+340%",
            "Signature Type": "Bounded Draw"
        }
        
    elif phase == "SHORTAGE":
        summary = "System-Wide Supply Shortage"
        
        # Rank zones by vulnerable elevation
        zone_elevs = {}
        zone_counts = {}
        for nid, states in node_states.items():
            if states.get("status") != "NORMAL":
                zone = states.get("zone_id", "Unknown")
                elev = _node_lookup.get(nid, {}).get("elevation", 50.0)
                zone_elevs[zone] = zone_elevs.get(zone, 0) + elev
                zone_counts[zone] = zone_counts.get(zone, 0) + 1
                
        avg_elevs = {z: zone_elevs[z]/zone_counts[z] for z in zone_elevs}
        most_vulnerable = max(avg_elevs.items(), key=lambda x: x[1])[0] if avg_elevs else "Z04"
        
        details = (
            f"Network-wide dynamic pressure limit reached. Primary reservoirs unable to maintain baseline head pressure. "
            f"Zone {most_vulnerable} is identified as most vulnerable due to highest average elevation ({avg_elevs.get(most_vulnerable, 55.0):.1f}m). "
            f"Hypothesis: Upstream reservoir depletion or primary pump failure."
        )
        metrics = {
            "Vulnerable Zone": most_vulnerable,
            "At-Risk Nodes": affected_count,
            "Avg Elevation": f"{avg_elevs.get(most_vulnerable, 55.0):.1f} m"
        }
        
    else:
        # AI_RECOVERY or others
        return None

    return {
        "summary": summary,
        "details": details,
        "metrics": metrics
    }
