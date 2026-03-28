from simulation import SimulationEngine, TARGET_PRESSURE
import streamlit as st
import plotly.graph_objects as go
import time
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# ── Page config ────────────────────────────────────────────────────────────────
st.set_page_config(page_title="HydroMind | Live SCADA",
                   layout="wide", initial_sidebar_state="collapsed")

# ── Advanced CSS ───────────────────────────────────────────────────────────────
st.markdown("""
<style>
.stApp { background: #02060F; color: #E2E8F0; }
.metric-box { background: #0A1128; border: 1px solid #1E2D4A; border-radius: 8px; padding: 20px; text-align: center; }
.val { font-size: 3rem; font-family: monospace; font-weight: bold; }
.lbl { color: #64748B; font-size: 0.9rem; letter-spacing: 1px; text-transform: uppercase; }
</style>
""", unsafe_allow_html=True)

# ── Session State ──────────────────────────────────────────────────────────────
if "engine" not in st.session_state:
    st.session_state.engine = SimulationEngine()
if "loss_usd" not in st.session_state:
    st.session_state.loss_usd = 0.0

engine = st.session_state.engine


def calculate_cost(nrw_pct):
    # Roughly $500 lost per timestep for every 10% of leakage
    return (nrw_pct / 10.0) * 500.0


# ── Layout: Title & Buttons ────────────────────────────────────────────────────
st.markdown("<h2 style='color:#00E5FF; font-family:monospace;'>💧 HYDROMIND // LIVE TELEMETRY</h2><hr>",
            unsafe_allow_html=True)

col1, col2, col3 = st.columns(3)
btn_rupture = col1.empty()
btn_ai = col2.empty()
btn_reset = col3.empty()

# ── Layout: Live Metrics Placeholders ──────────────────────────────────────────
m1, m2, m3 = st.columns(3)
ui_pressure = m1.empty()
ui_valve = m2.empty()
ui_loss = m3.empty()

st.markdown("<br>", unsafe_allow_html=True)

# ── Layout: Live Chart Placeholder ─────────────────────────────────────────────
ui_chart = st.empty()

# ── Helper: Draw UI Frame ──────────────────────────────────────────────────────


def update_screen(history, current_p, current_v, current_loss, status_color="#10B981"):
    # Update Metrics
    ui_pressure.markdown(
        f"<div class='metric-box'><div class='lbl'>Tail-End Pressure</div><div class='val' style='color:{status_color}'>{current_p:.1f}m</div></div>", unsafe_allow_html=True)
    ui_valve.markdown(
        f"<div class='metric-box'><div class='lbl'>Valve Actuation</div><div class='val' style='color:#8B5CF6'>{current_v:.1f}%</div></div>", unsafe_allow_html=True)
    ui_loss.markdown(
        f"<div class='metric-box'><div class='lbl'>Financial Damage</div><div class='val' style='color:#EF4444'>${current_loss:,.0f}</div></div>", unsafe_allow_html=True)

    # Update Chart
    if history:
        steps = [r["step"] for r in history]
        pressures = [r.get("tail_pressure", 0) for r in history]
        valves = [r.get("action_pct", 0) for r in history]

        fig = go.Figure()
        fig.add_trace(go.Scatter(x=steps, y=pressures, mode="lines+markers",
                      name="Pressure", line=dict(color=status_color, width=3)))
        fig.add_trace(go.Scatter(x=steps, y=valves, mode="lines", name="Valve",
                      yaxis="y2", line=dict(color="#8B5CF6", width=2, dash="dot")))
        fig.add_hline(y=TARGET_PRESSURE, line_dash="dash",
                      line_color="#10B981")

        fig.update_layout(
            template="plotly_dark", height=400, margin=dict(l=0, r=0, t=10, b=0), plot_bgcolor="#030816", paper_bgcolor="#030816",
            xaxis=dict(title="Timestep (Hours)"),
            yaxis=dict(title="Pressure (m)", range=[0, 30]),
            yaxis2=dict(title="Valve (%)", overlaying="y",
                        side="right", range=[0, 100]),
            showlegend=False
        )
        ui_chart.plotly_chart(fig, use_container_width=True)


# ── Initialize Base Screen ─────────────────────────────────────────────────────
if not engine.history:
    update_screen([], 20.0, 46.1, 0.0)

# ── Sequence 1: The Crash (Live Animation) ─────────────────────────────────────
# --- Sequence 1: The Crash (Live Animation) ---
if btn_rupture.button("1. INDUCE RUPTURE (AI OFF)", type="primary"):

    # Lock the engine into session state if it isn't there already
    if "sim_engine" not in st.session_state:
        # Binds your local engine to permanent memory
        st.session_state.sim_engine = engine

    # 1. Start the permanent session state engine
    st.session_state.sim_engine.start("Leakage Detected")
    st.session_state.loss_usd = 0.0

    # 2. Animate 15 frames of the network bleeding out
    for _ in range(15):
        # 3. Call step() strictly on the session state engine!
        res = st.session_state.sim_engine.step()
        st.session_state.loss_usd += calculate_cost(res.get('nrw_pct', 20.0))

        # Redraw the screen instantly
        update_screen(
            st.session_state.sim_engine.history,
            res.get("tail_pressure", 0),
            res.get("action_pct", 0),
            st.session_state.loss_usd,
            status_color="#EF4444"
        )
        time.sleep(0.2)  # Cinematic pause for the animation
# ── Sequence 2: The AI Recovery (Live Animation) ───────────────────────────────
if btn_ai.button("2. DEPLOY PYTORCH AGENT"):
    # Animate 30 frames of the AI fighting the pressure back up
    for _ in range(30):
        res = engine.step()  # AI takes over here
        st.session_state.loss_usd += calculate_cost(res.get('nrw_pct', 5.0))

        # Determine if we are recovered yet for the color
        current_p = res.get("tail_pressure", 0)
        color = "#00E5FF" if current_p > 18.0 else "#EF4444"

        # Redraw the screen instantly
        update_screen(engine.history, current_p, res.get(
            "action_pct", 0), st.session_state.loss_usd, status_color=color)
        time.sleep(0.2)  # Cinematic pause

# ── Sequence 3: Reset ──────────────────────────────────────────────────────────
if btn_reset.button("↻ RESET"):
    engine.reset()
    st.session_state.loss_usd = 0.0
    st.rerun()
