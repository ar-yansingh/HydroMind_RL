"""
Random Multi-Scenario Event Generator
Generates compound crisis scenarios for Simulation Mode.
"""

import random
import os
import json

# Load topology for node/link selection
_topo_path = os.path.join(os.path.dirname(__file__), '..', '..', 'command-center', 'src', 'assets', 'map_topology.json')
_topology = {"nodes": [], "links": []}
if os.path.exists(_topo_path):
    with open(_topo_path) as f:
        _topology = json.load(f)

_all_links = [l["id"] for l in _topology["links"]]
_leaf_nodes = [n["id"] for n in _topology["nodes"] if n.get("is_leaf", False)]
_all_node_ids = [n["id"] for n in _topology["nodes"]]
_non_source_nodes = [n["id"] for n in _topology["nodes"] if not n.get("is_source", False)]


def generate_random_events():
    """Generate a compound scenario with multiple simultaneous events.
    
    Returns a list of event dicts:
      {"type": "RUPTURE"|"SURGE"|"SHORTAGE", "target": str, "severity": float}
    """
    events = []

    # ── Always: 1–3 pipe ruptures ──
    rupture_count = random.randint(1, 3)
    rupture_targets = random.sample(_all_links, min(rupture_count, len(_all_links)))
    for link_id in rupture_targets:
        events.append({
            "type": "RUPTURE",
            "target": link_id,
            "severity": round(random.uniform(0.5, 1.0), 2),
        })

    # ── Always: 2–5 demand surges on leaf/non-source nodes ──
    surge_pool = _leaf_nodes if len(_leaf_nodes) >= 5 else _non_source_nodes
    surge_count = random.randint(2, 5)
    surge_targets = random.sample(surge_pool, min(surge_count, len(surge_pool)))
    for node_id in surge_targets:
        events.append({
            "type": "SURGE",
            "target": node_id,
            "multiplier": round(random.uniform(2.0, 5.0), 1),
        })

    # ── 50% chance: global supply shortage ──
    if random.random() < 0.5:
        events.append({
            "type": "SHORTAGE",
            "target": "GLOBAL",
            "severity": round(random.uniform(0.3, 0.7), 2),
        })

    return events


def describe_events(events):
    """Human-readable summary of a compound scenario."""
    ruptures = [e for e in events if e["type"] == "RUPTURE"]
    surges = [e for e in events if e["type"] == "SURGE"]
    shortages = [e for e in events if e["type"] == "SHORTAGE"]

    parts = []
    if ruptures:
        targets = ", ".join(e["target"] for e in ruptures)
        parts.append(f"{len(ruptures)} Rupture{'s' if len(ruptures) > 1 else ''} ({targets})")
    if surges:
        targets = ", ".join(e["target"] for e in surges)
        parts.append(f"{len(surges)} Surge{'s' if len(surges) > 1 else ''} ({targets})")
    if shortages:
        parts.append(f"Supply Shortage ({int(shortages[0]['severity'] * 100)}%)")

    return " + ".join(parts)


def compute_sim_results(events, node_states, elapsed_steps, ai_logs, peak_affected=0, pre_deploy_steps=0):
    """Compute final results after simulation stabilizes.
    
    Uses a multi-factor scoring system:
    - Recovery quality (post-AI pressure restoration)
    - Response speed (how quickly AI was deployed)
    - Containment (severely affected nodes only)
    - Difficulty bonus (more events = harder = more lenient)
    """
    total_nodes = len(node_states)
    
    # Count only SEVERELY affected nodes (pressure < 15m = critical threshold)
    severely_affected = sum(
        1 for ns in node_states.values()
        if ns.get("pressure_m", 30) < 15 and ns.get("status") not in ("NORMAL",)
    )
    
    # Use peak_affected for display, but grade on severity
    affected = peak_affected if peak_affected > 0 else sum(
        1 for ns in node_states.values() if ns.get("status") not in ("NORMAL", "AI_STABILIZED")
    )
    recovered = sum(1 for ns in node_states.values() if ns.get("status") in ("AI_STABILIZED", "AI_REROUTING", "AI_BOOSTED", "AI_BOOSTING", "AI_BALANCED", "AI_PRIORITIZED"))
    
    pressures = [ns.get("pressure_m", 0) for ns in node_states.values()]
    min_pressure = min(pressures) if pressures else 0
    avg_pressure = sum(pressures) / len(pressures) if pressures else 0
    
    # Economic loss (based on severely affected nodes, not all impacted)
    economic_loss = round(severely_affected * elapsed_steps * 0.12, 2)
    
    # ── Multi-Factor Scoring (0-100) ──
    
    # Factor 1: Recovery quality — how well did AI restore pressure? (40%)
    # Target: avg_pressure > 25m = perfect, < 10m = terrible
    pressure_score = min(100, max(0, (avg_pressure - 5) / 25 * 100))
    
    # Factor 2: Response speed — how fast did user deploy AI? (25%)
    # pre_deploy_steps: 0 = instant (100), 300+ = very slow (0)
    speed_score = min(100, max(0, 100 - pre_deploy_steps * 0.35))
    
    # Factor 3: Containment — severely affected ratio (20%)
    severe_ratio = severely_affected / max(total_nodes, 1)
    containment_score = min(100, max(0, (1 - severe_ratio * 3) * 100))
    
    # Factor 4: Difficulty bonus — more events = harder = higher bonus (15%)
    event_count = len(events)
    has_shortage = any(e["type"] == "SHORTAGE" for e in events)
    difficulty_bonus = min(100, 50 + event_count * 8 + (20 if has_shortage else 0))
    
    # Weighted total
    total_score = (
        pressure_score * 0.40 +
        speed_score * 0.25 +
        containment_score * 0.20 +
        difficulty_bonus * 0.15
    )
    
    # Grade from score
    if total_score >= 90:
        grade = "A+"
    elif total_score >= 80:
        grade = "A"
    elif total_score >= 65:
        grade = "B"
    elif total_score >= 50:
        grade = "C"
    elif total_score >= 35:
        grade = "D"
    else:
        grade = "F"
    
    # ── Grade Analysis ──
    analysis_parts = []
    
    # What went well
    if pressure_score >= 70:
        analysis_parts.append(f"✓ Pressure restored to {round(avg_pressure, 1)}m avg — well above the 15m critical threshold.")
    if containment_score >= 70:
        analysis_parts.append(f"✓ Strong containment — only {severely_affected} nodes reached critical pressure levels (<15m).")
    if recovered > total_nodes * 0.5:
        analysis_parts.append(f"✓ Successfully recovered {recovered} of {total_nodes} nodes through rerouting and valve control.")
    if speed_score >= 70:
        analysis_parts.append(f"✓ Fast response — AI deployed and stabilized the network in {round(elapsed_steps * 0.1, 1)}s.")
    if event_count >= 4:
        analysis_parts.append(f"✓ Handled a complex {event_count}-event compound scenario{'  with global supply shortage' if has_shortage else ''}.")
    
    # What was concerning
    if pressure_score < 50:
        analysis_parts.append(f"⚠ Average pressure dropped to {round(avg_pressure, 1)}m — many consumers experienced low water pressure.")
    if containment_score < 50:
        analysis_parts.append(f"⚠ {severely_affected} nodes reached critically low pressure (<15m) during the crisis.")
    if speed_score < 50:
        analysis_parts.append(f"⚠ Delayed response — AI took {round(elapsed_steps * 0.1, 1)}s to fully stabilize. Consider deploying AI sooner.")
    if economic_loss > 500:
        analysis_parts.append(f"⚠ Economic impact of ₹{economic_loss} from sustained service disruption.")
    
    # Context
    if has_shortage:
        analysis_parts.append("ℹ Global supply shortage increased difficulty — triage rationing was required.")
    
    # Overall verdict
    if grade in ("A+", "A"):
        analysis_parts.append("Overall: Excellent response. AI isolated threats quickly, maintained pressure, and minimized consumer impact.")
    elif grade == "B":
        analysis_parts.append("Overall: Good response. Network recovered well, with minor pressure dips in some areas.")
    elif grade == "C":
        analysis_parts.append("Overall: Adequate response. Some consumers experienced temporary service disruption before recovery.")
    elif grade == "D":
        analysis_parts.append("Overall: Below average. Significant portions of the network experienced low pressure. Consider deploying AI earlier.")
    else:
        analysis_parts.append("Overall: Poor response. Crisis cascaded widely before AI intervention. Immediate deployment is recommended.")

    grade_analysis = " ".join(analysis_parts)

    return {
        "total_nodes": total_nodes,
        "affected_nodes": affected,
        "severely_affected": severely_affected,
        "recovered_nodes": recovered,
        "min_pressure_m": round(min_pressure, 1),
        "avg_pressure_m": round(avg_pressure, 1),
        "elapsed_steps": elapsed_steps,
        "elapsed_seconds": round(elapsed_steps * 0.1, 1),
        "economic_loss": economic_loss,
        "grade": grade,
        "score": round(total_score, 1),
        "grade_analysis": grade_analysis,
        "event_count": event_count,
        "had_shortage": has_shortage,
    }
