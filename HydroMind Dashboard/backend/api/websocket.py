import asyncio
import json
import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.models.state import DigitalTwinState
from backend.simulation.physics import (
    _get_network_reachability, _generate_node_states, _generate_link_states,
    _resolve_targets_to_nodes, compute_network_analytics, get_triage_sacrifice_zones,
    _compute_flow_directions, generate_diagnostic
)
from backend.simulation.simulation import generate_random_events, describe_events, compute_sim_results
from main import trigger_rupture, trigger_surge, trigger_shortage, reset_scenarios
from backend.database.db import insert_telemetry_tick
from backend.utils.logger import get_logger

logger = get_logger("HydroMind.Websocket")

router = APIRouter()
_twin_state = None

def get_twin_state():
    global _twin_state
    if _twin_state is None:
        _twin_state = DigitalTwinState()
    return _twin_state

@router.get("/health")
async def health_check():
    # Return immediately! Do not block the event loop with synchronous 'get_twin_state()'
    global _twin_state
    is_ready = _twin_state is not None and getattr(_twin_state, 'model_loaded', False)
    return {
        "status": "ok",
        "model_loaded": is_ready
    }

@router.websocket("/ws/telemetry")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("Frontend React Client Connected!")

    try:
        async def listen_for_commands():
            while True:
                data = await websocket.receive_text()
                command = json.loads(data)
                action = command.get("action")
                target = command.get("target_node")
                targets = command.get("target_nodes", [target] if target else [])

                if action == "trigger_rupture":
                    ts = datetime.datetime.now().strftime("%H:%M:%S")
                    get_twin_state().phase = "RUPTURE"
                    get_twin_state().original_scenario = "RUPTURE"
                    get_twin_state().active_target = target
                    get_twin_state().active_targets = targets
                    get_twin_state().ai_logs.append(f"[{ts}] [CRITICAL] RUPTURE DETECTED AT {targets}")
                    for t in targets:
                        if t:
                            trigger_rupture(t)
                    logger.warning(f"Crisis: RUPTURE at {targets}")

                elif action == "trigger_surge":
                    get_twin_state().phase = "SURGE"
                    get_twin_state().original_scenario = "SURGE"
                    get_twin_state().active_target = target
                    get_twin_state().active_targets = targets
                    for t in targets:
                        if t:
                            trigger_surge(t)
                    logger.warning(f"Crisis: DEMAND SURGE at {targets}")

                elif action == "trigger_shortage":
                    get_twin_state().phase = "SHORTAGE"
                    get_twin_state().original_scenario = "SHORTAGE"
                    get_twin_state().active_target = target
                    get_twin_state().active_targets = targets
                    ts = datetime.datetime.now().strftime("%H:%M:%S")
                    get_twin_state().ai_logs.append(f"[{ts}] [CRITICAL] GLOBAL SUPPLY DROP")
                    logger.warning("Crisis: GLOBAL SUPPLY DROP")

                elif action == "deploy_ai":
                    ts = datetime.datetime.now().strftime("%H:%M:%S")
                    get_twin_state().phase = "AI_RECOVERY"
                    get_twin_state().ai_logs.append(f"[{ts}] [SYSTEM] DEPLOYING GNN ISOLATION AGENT")
                    logger.info(f"Action: AI ISOLATING {get_twin_state().active_targets}")

                elif action == "toggle_link":
                    targets = command.get("target_nodes", [])
                    status = command.get("status")
                    if status == "CLOSED":
                        for t in targets:
                            get_twin_state().closed_links.add(t)
                        ts = datetime.datetime.now().strftime("%H:%M:%S")
                        get_twin_state().ai_logs.append(f"[{ts}] [MANUAL] VALVE {targets} CLOSED")
                        logger.info(f"Action: MANUALLY CLOSED {targets}")
                    elif status == "OPEN":
                        for t in targets:
                            if t in get_twin_state().closed_links:
                                get_twin_state().closed_links.remove(t)
                        ts = datetime.datetime.now().strftime("%H:%M:%S")
                        get_twin_state().ai_logs.append(f"[{ts}] [MANUAL] VALVE {targets} OPENED")
                        logger.info(f"Action: MANUALLY OPENED {targets}")

                elif action == "reset_ambient":
                    ts = datetime.datetime.now().strftime("%H:%M:%S")
                    twin = get_twin_state()
                    twin.phase = "AMBIENT"
                    twin.original_scenario = "AMBIENT"
                    twin.total_loss = 0.0
                    twin.ai_alert = None
                    twin.active_target = None
                    twin.active_targets = []
                    twin.closed_links.clear()
                    # Reset simulation mode too
                    twin.sim_mode = False
                    twin.active_events = []
                    twin.sim_log = []
                    twin.sim_results = None
                    twin.sim_ai_deployed = False
                    # Crucial: Reset the underlying stateful physics environment (wntr)
                    try:
                        twin.state = twin.env.reset(apply_anomaly=False) 
                    except Exception as e:
                        print(f"Warning: Environment reset failed: {e}")
                        
                    twin.ai_logs.append(f"[{ts}] SCADA Manual Override: System Reset to Ambient")
                    twin.status_msg = "Nominal System Operating"
                    reset_scenarios()
                    logger.info("System Reset: AMBIENT")

                # ═══ SIMULATION MODE COMMANDS ═══════════════════════
                elif action == "start_simulation":
                    ts = datetime.datetime.now().strftime("%H:%M:%S")
                    twin = get_twin_state()
                    
                    # Generate random compound scenario
                    events = generate_random_events()
                    
                    # Reset to clean state first
                    twin.closed_links.clear()
                    twin.total_loss = 0.0
                    twin.ai_alert = None
                    twin.ai_saved = 0.0 if hasattr(twin, 'ai_saved') else 0.0
                    try:
                        twin.state = twin.env.reset(apply_anomaly=False)
                    except Exception:
                        pass
                    reset_scenarios()
                    
                    # Set simulation state
                    twin.sim_mode = True
                    twin.active_events = events
                    twin.sim_start_step = twin.step
                    twin.sim_ai_deployed = False
                    twin.sim_results = None
                    twin._sim_peak_affected = 0
                    # Collect all targets for physics
                    all_targets = []
                    rupture_targets = []
                    surge_targets = []
                    has_shortage = False
                    
                    for event in events:
                        all_targets.append(event["target"])
                        if event["type"] == "RUPTURE":
                            rupture_targets.append(event["target"])
                            trigger_rupture(event["target"])
                        elif event["type"] == "SURGE":
                            surge_targets.append(event["target"])
                            trigger_surge(event["target"])
                        elif event["type"] == "SHORTAGE":
                            has_shortage = True
                    
                    # Set phase to compound — use RUPTURE as base (highest severity)
                    twin.phase = "RUPTURE"
                    twin.original_scenario = "SIM_COMPOUND"
                    twin.active_targets = rupture_targets + surge_targets
                    twin.active_target = rupture_targets[0] if rupture_targets else (surge_targets[0] if surge_targets else None)
                    
                    # Build sim log
                    desc = describe_events(events)
                    twin.sim_log = [
                        f"[{ts}] SCENARIO INJECTED: {desc}",
                    ]
                    for e in events:
                        if e["type"] == "RUPTURE":
                            twin.sim_log.append(f"[{ts}] RUPTURE: Pipe {e['target']} compromised (severity {int(e['severity']*100)}%)")
                        elif e["type"] == "SURGE":
                            twin.sim_log.append(f"[{ts}] SURGE: Node {e['target']} demand x{e['multiplier']}")
                        elif e["type"] == "SHORTAGE":
                            twin.sim_log.append(f"[{ts}] SHORTAGE: Global supply reduced by {int(e['severity']*100)}%")
                    
                    twin.ai_logs = list(twin.sim_log)  # Copy to main logs too
                    logger.warning(f"SIMULATION STARTED: {desc}")

                elif action == "deploy_sim_ai":
                    ts = datetime.datetime.now().strftime("%H:%M:%S")
                    twin = get_twin_state()
                    twin.sim_ai_deployed = True
                    twin.sim_deploy_step = twin.step
                    twin.phase = "AI_RECOVERY"
                    
                    # Generate detailed AI action log entries
                    rupture_events = [e for e in twin.active_events if e["type"] == "RUPTURE"]
                    surge_events = [e for e in twin.active_events if e["type"] == "SURGE"]
                    shortage_events = [e for e in twin.active_events if e["type"] == "SHORTAGE"]
                    
                    twin.sim_log.append(f"[{ts}] ───────────────────────────────")
                    twin.sim_log.append(f"[{ts}] AI DEPLOYED: GNN Isolation Agent activated")
                    twin.sim_log.append(f"[{ts}] AI: Analyzing network graph topology...")
                    twin.sim_log.append(f"[{ts}] AI: Identified {len(rupture_events)} rupture(s), {len(surge_events)} surge(s){', 1 shortage' if shortage_events else ''}")
                    
                    for e in rupture_events:
                        twin.sim_log.append(f"[{ts}] AI ACTION: Closing upstream valve for pipe {e['target']}")
                        twin.sim_log.append(f"[{ts}] AI ACTION: Isolating rupture zone around {e['target']} (severity {int(e['severity']*100)}%)")
                        twin.sim_log.append(f"[{ts}] AI ACTION: Rerouting flow via alternate network paths")
                    for e in surge_events:
                        twin.sim_log.append(f"[{ts}] AI ACTION: Boosting supply to node {e['target']} (demand x{e['multiplier']})")
                        twin.sim_log.append(f"[{ts}] AI ACTION: Opening reserve valve for {e['target']} zone")
                    if shortage_events:
                        sev = shortage_events[0]['severity']
                        twin.sim_log.append(f"[{ts}] AI ACTION: Global supply reduced by {int(sev*100)}% — activating triage")
                        twin.sim_log.append(f"[{ts}] AI ACTION: Prioritizing critical infrastructure zones")
                        twin.sim_log.append(f"[{ts}] AI ACTION: Rationing non-critical residential sectors")
                    
                    twin.sim_log.append(f"[{ts}] AI STATUS: Compound recovery sequence initiated")
                    twin.sim_log.append(f"[{ts}] ───────────────────────────────")
                    twin.ai_logs = list(twin.sim_log)
                    logger.info("SIMULATION: AI deployed for compound recovery")

                elif action == "stop_simulation":
                    ts = datetime.datetime.now().strftime("%H:%M:%S")
                    twin = get_twin_state()
                    twin.sim_mode = False
                    twin.active_events = []
                    twin.sim_log.append(f"[{ts}] SIMULATION ENDED")
                    twin.phase = "AMBIENT"
                    twin.original_scenario = "AMBIENT"
                    twin.active_target = None
                    twin.active_targets = []
                    twin.closed_links.clear()
                    try:
                        twin.state = twin.env.reset(apply_anomaly=False)
                    except Exception:
                        pass
                    reset_scenarios()
                    logger.info("SIMULATION STOPPED")

        frame_count = 0

        async def broadcast_telemetry():
            nonlocal frame_count
            if not hasattr(get_twin_state(), 'ai_saved'):
                get_twin_state().ai_saved = 0.0

            while True:
                twin = get_twin_state()
                twin.advance_physics()
                frame_count += 1
                current_leak = 45.5 if twin.phase == "RUPTURE" else 0.0

                if twin.phase == "RUPTURE":
                    twin.total_loss += (current_leak * 0.12) / 10.0
                elif twin.phase == "AI_RECOVERY":
                    twin.ai_saved += (45.5 * 0.12) / 10.0

                # ── Simulation mode: snapshot affected nodes at crisis peak (before AI) ──
                # (actual snapshot happens in node_states block below)

                # ── Simulation mode: add periodic AI progress logs ──
                if twin.sim_mode and twin.sim_ai_deployed:
                    elapsed = twin.step - twin.sim_start_step
                    if elapsed > 30 and elapsed % 50 == 0:
                        ts = datetime.datetime.now().strftime("%H:%M:%S")
                        twin.sim_log.append(f"[{ts}] AI PROGRESS: Network pressure stabilizing ({elapsed} steps elapsed)")

                payload = {
                    "step": twin.step,
                    "phase": twin.phase,
                    "pressure_m": round(twin.pressure_m, 2),
                    "valve_pct": twin.valve_pct if twin.phase in ["AI_RECOVERY", "RUPTURE", "SURGE", "SHORTAGE"] else 100.0,
                    "leak_rate_lps": current_leak,
                    "economic_bleed": round(twin.total_loss, 2),
                    "status": twin.status_msg,
                    "anomaly_node": getattr(twin, 'active_target', None),
                    "anomaly_targets": getattr(twin, 'active_targets', []),
                    "scenario": twin.phase,
                    "closed_links": list(twin.closed_links),
                    "ai_logs": twin.ai_logs,
                    "ai_alert": twin.ai_alert,
                    "ai_saved": round(twin.ai_saved, 2),
                    # ── Simulation mode fields ──
                    "sim_mode": twin.sim_mode,
                    "active_events": twin.active_events if twin.sim_mode else [],
                    "sim_log": twin.sim_log if twin.sim_mode else [],
                    "sim_results": twin.sim_results,
                    "sim_ai_deployed": getattr(twin, 'sim_ai_deployed', False),
                }

                # Persist telemetry payload every tick asynchronously using TSDB
                insert_telemetry_tick(payload)

                if frame_count % 5 == 0:
                    anomaly_targets = getattr(twin, 'active_targets', []) or []
                    rch, dwn, alt, hop_dist = _get_network_reachability(twin.closed_links, anomaly_targets, twin.phase)

                    proposed_nodes = _generate_node_states(
                        twin.phase, twin.step, rch, dwn, anomaly_targets, None, getattr(twin, 'original_scenario', 'AMBIENT'), alternate_supply=alt
                    )
                    payload["node_states"] = proposed_nodes
                    payload["link_states"] = _generate_link_states(
                        twin.phase, twin.step, twin.closed_links, rch, dwn, anomaly_targets, None, getattr(twin, 'original_scenario', 'AMBIENT')
                    )

                    # Compute flow directions strictly using BFS topology distance
                    payload["flow_directions"] = _compute_flow_directions(payload["node_states"], payload["link_states"], hop_dist)

                    # Compute analytics
                    analytics = compute_network_analytics(payload["node_states"])
                    payload["network_analytics"] = analytics

                    # Generate AI Diagnostic
                    diag = generate_diagnostic(twin.phase, anomaly_targets, payload["node_states"], rch)
                    payload["diagnostics"] = [diag] if diag else []

                    # ── Simulation: snapshot crisis-time affected nodes ──
                    if twin.sim_mode and not twin.sim_ai_deployed:
                        crisis_affected = sum(
                            1 for ns in proposed_nodes.values()
                            if ns.get('status') not in ('NORMAL',)
                        )
                        twin._sim_peak_affected = max(getattr(twin, '_sim_peak_affected', 0), crisis_affected)

                    # ── Simulation: compute results when AI stabilizes ──
                    if twin.sim_mode and twin.sim_ai_deployed and twin.sim_results is None:
                        elapsed = twin.step - twin.sim_start_step
                        if elapsed >= 100:  # After ~10 seconds of AI work
                            ts = datetime.datetime.now().strftime("%H:%M:%S")
                            peak_affected = getattr(twin, '_sim_peak_affected', 0)
                            pre_deploy_steps = getattr(twin, 'sim_deploy_step', twin.sim_start_step) - twin.sim_start_step
                            twin.sim_results = compute_sim_results(
                                twin.active_events, proposed_nodes, elapsed, twin.sim_log, peak_affected, pre_deploy_steps
                            )
                            twin.sim_log.append(f"[{ts}] ───────────────────────────────")
                            twin.sim_log.append(f"[{ts}] NETWORK STABILIZED: Recovery complete in {twin.sim_results['elapsed_seconds']}s")
                            twin.sim_log.append(f"[{ts}] RESULT: {twin.sim_results['affected_nodes']} nodes were affected during crisis")
                            twin.sim_log.append(f"[{ts}] RESULT: Avg pressure restored to {twin.sim_results['avg_pressure_m']}m")
                            twin.sim_log.append(f"[{ts}] RESULT: Economic impact ₹{twin.sim_results['economic_loss']}")
                            twin.sim_log.append(f"[{ts}] GRADE: {twin.sim_results['grade']}")
                            twin.sim_log.append(f"[{ts}] ───────────────────────────────")
                            payload["sim_results"] = twin.sim_results

                await websocket.send_text(json.dumps(payload))
                await asyncio.sleep(0.1)

        await asyncio.gather(
            listen_for_commands(),
            broadcast_telemetry()
        )

    except WebSocketDisconnect:
        logger.info("Frontend Client Disconnected.")
