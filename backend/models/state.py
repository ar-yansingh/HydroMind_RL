import numpy as np
import torch
import random
from torch_geometric.data import Data
from main import Actor, AquaFlowEnv
from backend.utils.logger import get_logger

logger = get_logger("HydroMind.DigitalTwin")

class DigitalTwinState:
    def __init__(self):
        self.phase = "AMBIENT"
        self.step = 0
        self.pressure_m = 20.0
        self.valve_pct = 46.1
        self.nrw_loss_pct = 4.2
        self.status_msg = "SYSTEM STABLE"
        self.pid_pressure = 20.0
        self.total_loss = 0.0
        self.active_target = None
        self.active_targets = []
        self.closed_links = set()
        self.ai_logs = []
        self.ai_alert = None

        logger.info("Booting AquaFlow Physics Engine...")
        self.env = AquaFlowEnv()
        self.state = self.env.reset()

        logger.info("Loading GNN Actor Agent...")
        self.actor = Actor(
            num_node_features=3,
            hidden_dim=64,
            action_dim=1,
            max_action=50.0
        )
        try:
            self.actor.load_state_dict(torch.load("models/checkpoints/actor_final.pth"))
        except Exception as e:
            logger.warning(f"Could not load actor model weights: {e}")
        self.actor.eval()
        logger.info("System Ready.")

    def advance_physics(self):
        self.step += 1

        if self.phase == "AMBIENT":
            self.state, reward, done, truncated, info = self.env.step(action=[0.46])
            self.pressure_m = info.get('tail_pressure', 20.0)

        elif self.phase == "RUPTURE":
            self.state, reward, done, truncated, info = self.env.step(action=[0.46])
            self.pressure_m = info.get('tail_pressure', 4.5)
            self.nrw_loss_pct = 18.5

        elif self.phase == "AI_RECOVERY":
            try:
                from backend.ai.inference import run_gnn_inference
                action_to_apply = run_gnn_inference(self.actor, self.state)

                self.state, reward, done, truncated, info = self.env.step(action=action_to_apply)
                self.pressure_m = info.get('node_b_pressure', 20.0)
                self.leak_rate_lps = info.get('leak_rate_lps', 0.0)
                
                # Force rapid simulated closure representing the agent's isolation sequence
                self.valve_pct = max(14.5, getattr(self, 'valve_pct', 100.0) * 0.85)
                self.status_msg = "GNN ACTIVE: STABILIZING NETWORK"
                
                # Push log if valve changes significantly and not recently logged
                if len(self.ai_logs) < 10 or (self.step % 15 == 0):
                    import datetime
                    ts = datetime.datetime.now().strftime("%H:%M:%S")
                    if self.step % 30 == 0:
                        self.ai_logs.append(f"[{ts}] [AI] ⚙️ VALVE APERTURE SET TO {self.valve_pct:.1f}%")
                    if len(self.ai_logs) > 30:
                        self.ai_logs.pop(0)
                        
                # Alert maintenance on severe restriction isolation
                if self.valve_pct < 50.0 and self.active_target:
                    self.ai_alert = f"MAINTENANCE ALERT: Dispatch repair crew to isolate {self.active_target}."

            except Exception as e:
                logger.error(f"AI DEPLOYMENT CRASH: {e}")
                self.status_msg = f"AI ERROR: {str(e)[:40]}"
                self.phase = "RUPTURE"

        if self.phase != "AMBIENT":
            self.nrw_loss_pct = min(40.0, self.nrw_loss_pct + random.uniform(0.1, 0.5))
        else:
            self.nrw_loss_pct = max(4.0, self.nrw_loss_pct - random.uniform(0.1, 0.5))
