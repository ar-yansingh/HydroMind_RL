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
twin_state = DigitalTwinState()

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
                    twin_state.phase = "RUPTURE"
                    twin_state.active_target = target
                    twin_state.active_targets = targets
                    twin_state.ai_logs.append(f"[{ts}] [CRITICAL] ⭙ RUPTURE DETECTED AT {targets}")
                    for t in targets:
                        if t:
                            trigger_rupture(t)
                    logger.warning(f"Crisis: RUPTURE at {targets}")

                elif action == "trigger_surge":
                    twin_state.phase = "SURGE"
                    twin_state.active_target = target
                    twin_state.active_targets = targets
                    for t in targets:
                        if t:
                            trigger_surge(t)
                    logger.warning(f"Crisis: DEMAND SURGE at {targets}")

                elif action == "trigger_shortage":
                    twin_state.phase = "SHORTAGE"
                    twin_state.active_target = target
                    twin_state.active_targets = targets
                    import datetime
                    ts = datetime.datetime.now().strftime("%H:%M:%S")
                    twin_state.ai_logs.append(f"[{ts}] [CRITICAL] ▼ GLOBAL SUPPLY DROP")
                    logger.warning("Crisis: GLOBAL SUPPLY DROP")

                elif action == "deploy_ai":
                    import datetime
                    ts = datetime.datetime.now().strftime("%H:%M:%S")
                    twin_state.phase = "AI_RECOVERY"
                    twin_state.ai_logs.append(f"[{ts}] [SYSTEM] ⚡ DEPLOYING GNN ISOLATION AGENT")
                    logger.info(f"Action: AI ISOLATING {twin_state.active_targets}")

                elif action == "toggle_link":
                    targets = command.get("target_nodes", [])
                    status = command.get("status")
                    if status == "CLOSED":
                        for t in targets:
                            twin_state.closed_links.add(t)
                        import datetime
                        ts = datetime.datetime.now().strftime("%H:%M:%S")
                        twin_state.ai_logs.append(f"[{ts}] [MANUAL] 🛑 VALVE {targets} CLOSED")
                        logger.info(f"Action: MANUALLY CLOSED {targets}")
                    elif status == "OPEN":
                        for t in targets:
                            if t in twin_state.closed_links:
                                twin_state.closed_links.remove(t)
                        import datetime
                        ts = datetime.datetime.now().strftime("%H:%M:%S")
                        twin_state.ai_logs.append(f"[{ts}] [MANUAL] 🟢 VALVE {targets} OPENED")
                        logger.info(f"Action: MANUALLY OPENED {targets}")

                elif action == "reset_ambient":
                    import datetime
                    ts = datetime.datetime.now().strftime("%H:%M:%S")
                    twin_state.phase = "AMBIENT"
                    twin_state.total_loss = 0.0
                    twin_state.active_target = None
                    twin_state.active_targets = []
                    twin_state.closed_links = set()
                    twin_state.ai_logs.append(f"[{ts}] [SYSTEM] ↺ GRID RESET TO AMBIENT")
                    twin_state.ai_alert = None
                    reset_scenarios()
                    logger.info("System Reset: AMBIENT")

        frame_count = 0

        async def broadcast_telemetry():
            nonlocal frame_count
            if not hasattr(twin_state, 'ai_saved'):
                twin_state.ai_saved = 0.0
                
            while True:
                twin_state.advance_physics()
                frame_count += 1
                current_leak = 45.5 if twin_state.phase == "RUPTURE" else 0.0

                if twin_state.phase == "RUPTURE":
                    twin_state.total_loss += (current_leak * 0.12) / 10.0
                elif twin_state.phase == "AI_RECOVERY":
                    twin_state.ai_saved += (45.5 * 0.12) / 10.0

                payload = {
                    "step": twin_state.step,
                    "phase": twin_state.phase,
                    "pressure_m": round(twin_state.pressure_m, 2),
                    "valve_pct": twin_state.valve_pct if twin_state.phase in ["AI_RECOVERY", "RUPTURE"] else 100.0,
                    "leak_rate_lps": current_leak,
                    "economic_bleed": round(twin_state.total_loss, 2),
                    "status": twin_state.status_msg,
                    "anomaly_node": getattr(twin_state, 'active_target', None),
                    "anomaly_targets": getattr(twin_state, 'active_targets', []),
                    "scenario": twin_state.phase,
                    "closed_links": list(twin_state.closed_links),
                    "ai_logs": twin_state.ai_logs,
                    "ai_alert": twin_state.ai_alert,
                    "ai_saved": round(twin_state.ai_saved, 2)
                }
                
                # Persist telemetry payload every tick asynchronously using TSDB
                insert_telemetry_tick(payload)

                if frame_count % 5 == 0:
                    anomaly_targets = getattr(twin_state, 'active_targets', []) or []
                    rch, dwn = _get_network_reachability(twin_state.closed_links, anomaly_targets, twin_state.phase)
                    payload["node_states"] = _generate_node_states(
                        twin_state.phase, twin_state.step, rch, dwn, anomaly_targets
                    )
                    payload["link_states"] = _generate_link_states(
                        twin_state.phase, twin_state.step, twin_state.closed_links, rch, dwn, anomaly_targets
                    )

                await websocket.send_text(json.dumps(payload))
                await asyncio.sleep(0.1)

        await asyncio.gather(
            listen_for_commands(),
            broadcast_telemetry()
        )

    except WebSocketDisconnect:
        logger.info("Frontend Client Disconnected.")
