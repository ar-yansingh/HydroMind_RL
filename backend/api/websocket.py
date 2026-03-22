import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.models.state import DigitalTwinState
from backend.simulation.physics import _get_network_reachability, _generate_node_states, _generate_link_states, _resolve_targets_to_nodes
from main import trigger_rupture, trigger_surge, reset_scenarios
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
    state = get_twin_state()
    return {
        "status": "ok",
        "model_loaded": state.model_loaded
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
                    import datetime
                    ts = datetime.datetime.now().strftime("%H:%M:%S")
                    get_twin_state().phase = "RUPTURE"
                    get_twin_state().active_target = target
                    get_twin_state().active_targets = targets
                    get_twin_state().ai_logs.append(f"[{ts}] [CRITICAL] ⭙ RUPTURE DETECTED AT {targets}")
                    for t in targets:
                        if t:
                            trigger_rupture(t)
                    logger.warning(f"Crisis: RUPTURE at {targets}")

                elif action == "trigger_surge":
                    get_twin_state().phase = "SURGE"
                    get_twin_state().active_target = target
                    get_twin_state().active_targets = targets
                    for t in targets:
                        if t:
                            trigger_surge(t)
                    logger.warning(f"Crisis: DEMAND SURGE at {targets}")

                elif action == "trigger_shortage":
                    get_twin_state().phase = "SHORTAGE"
                    get_twin_state().active_target = target
                    get_twin_state().active_targets = targets
                    import datetime
                    ts = datetime.datetime.now().strftime("%H:%M:%S")
                    get_twin_state().ai_logs.append(f"[{ts}] [CRITICAL] ▼ GLOBAL SUPPLY DROP")
                    logger.warning("Crisis: GLOBAL SUPPLY DROP")

                elif action == "deploy_ai":
                    import datetime
                    ts = datetime.datetime.now().strftime("%H:%M:%S")
                    get_twin_state().phase = "AI_RECOVERY"
                    get_twin_state().ai_logs.append(f"[{ts}] [SYSTEM] ⚡ DEPLOYING GNN ISOLATION AGENT")
                    logger.info(f"Action: AI ISOLATING {get_twin_state().active_targets}")

                elif action == "toggle_link":
                    targets = command.get("target_nodes", [])
                    status = command.get("status")
                    if status == "CLOSED":
                        for t in targets:
                            get_twin_state().closed_links.add(t)
                        import datetime
                        ts = datetime.datetime.now().strftime("%H:%M:%S")
                        get_twin_state().ai_logs.append(f"[{ts}] [MANUAL] 🛑 VALVE {targets} CLOSED")
                        logger.info(f"Action: MANUALLY CLOSED {targets}")
                    elif status == "OPEN":
                        for t in targets:
                            if t in get_twin_state().closed_links:
                                get_twin_state().closed_links.remove(t)
                        import datetime
                        ts = datetime.datetime.now().strftime("%H:%M:%S")
                        get_twin_state().ai_logs.append(f"[{ts}] [MANUAL] 🟢 VALVE {targets} OPENED")
                        logger.info(f"Action: MANUALLY OPENED {targets}")

                elif action == "reset_ambient":
                    import datetime
                    ts = datetime.datetime.now().strftime("%H:%M:%S")
                    get_twin_state().phase = "AMBIENT"
                    get_twin_state().total_loss = 0.0
                    get_twin_state().active_target = None
                    get_twin_state().active_targets = []
                    get_twin_state().closed_links = set()
                    get_twin_state().ai_logs.append(f"[{ts}] [SYSTEM] ↺ GRID RESET TO AMBIENT")
                    get_twin_state().ai_alert = None
                    reset_scenarios()
                    logger.info("System Reset: AMBIENT")

        frame_count = 0

        async def broadcast_telemetry():
            nonlocal frame_count
            if not hasattr(get_twin_state(), 'ai_saved'):
                get_twin_state().ai_saved = 0.0
                
            while True:
                get_twin_state().advance_physics()
                frame_count += 1
                current_leak = 45.5 if get_twin_state().phase == "RUPTURE" else 0.0

                if get_twin_state().phase == "RUPTURE":
                    get_twin_state().total_loss += (current_leak * 0.12) / 10.0
                elif get_twin_state().phase == "AI_RECOVERY":
                    get_twin_state().ai_saved += (45.5 * 0.12) / 10.0

                payload = {
                    "step": get_twin_state().step,
                    "phase": get_twin_state().phase,
                    "pressure_m": round(get_twin_state().pressure_m, 2),
                    "valve_pct": get_twin_state().valve_pct if get_twin_state().phase in ["AI_RECOVERY", "RUPTURE"] else 100.0,
                    "leak_rate_lps": current_leak,
                    "economic_bleed": round(get_twin_state().total_loss, 2),
                    "status": get_twin_state().status_msg,
                    "anomaly_node": getattr(get_twin_state(), 'active_target', None),
                    "anomaly_targets": getattr(get_twin_state(), 'active_targets', []),
                    "scenario": get_twin_state().phase,
                    "closed_links": list(get_twin_state().closed_links),
                    "ai_logs": get_twin_state().ai_logs,
                    "ai_alert": get_twin_state().ai_alert,
                    "ai_saved": round(get_twin_state().ai_saved, 2)
                }
                
                # Persist telemetry payload every tick asynchronously using TSDB
                insert_telemetry_tick(payload)

                if frame_count % 5 == 0:
                    anomaly_targets = getattr(get_twin_state(), 'active_targets', []) or []
                    rch, dwn = _get_network_reachability(get_twin_state().closed_links, anomaly_targets, get_twin_state().phase)
                    payload["node_states"] = _generate_node_states(
                        get_twin_state().phase, get_twin_state().step, rch, dwn, anomaly_targets
                    )
                    payload["link_states"] = _generate_link_states(
                        get_twin_state().phase, get_twin_state().step, get_twin_state().closed_links, rch, dwn, anomaly_targets
                    )

                await websocket.send_text(json.dumps(payload))
                await asyncio.sleep(0.1)

        await asyncio.gather(
            listen_for_commands(),
            broadcast_telemetry()
        )

    except WebSocketDisconnect:
        logger.info("Frontend Client Disconnected.")
