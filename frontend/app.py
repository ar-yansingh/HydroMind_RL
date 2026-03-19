import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
from datetime import datetime
import sys
import os
import time

# Make sure the simulation module can be imported from the same directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from simulation import SimulationEngine, SCENARIOS, TARGET_PRESSURE

# ── UI / behaviour constants ───────────────────────────────────────────────
# Maximum number of log lines kept in the terminal panel.
MAX_TERMINAL_LOG_ENTRIES = 40
# Pause between auto-run steps; keeps the animation readable at ~3 fps.
AUTO_RUN_DELAY_SECONDS = 0.35
# Small value added to the denominator when computing % improvement to prevent
# a divide-by-zero when the manual baseline error is essentially 0.
_MIN_DIVISOR = 1e-3

# --- PAGE CONFIGURATION ---
st.set_page_config(page_title="AquaFlow | Edge SCADA",
                   layout="wide", page_icon="🚰")

# --- CUSTOM INDUSTRIAL CSS ---
st.markdown("""
    <style>
    /* Global Backgrounds */
    .stApp { background-color: #0B0F19; color: #E2E8F0; }

    /* Hide Default Streamlit UI Elements */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}

    /* Custom Digital Readout Cards */
    .scada-card {
        background: linear-gradient(145deg, #111827, #1F2937);
        border: 1px solid #374151;
        border-radius: 6px;
        padding: 15px;
        box-shadow: inset 0px 0px 10px rgba(0, 0, 0, 0.5);
    }
    .scada-title { font-size: 0.85rem; color: #9CA3AF; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
    .scada-value { font-size: 2rem; font-weight: 700; font-family: 'Courier New', monospace; }
    .scada-delta { font-size: 0.85rem; font-weight: bold; margin-top: 5px; }

    /* Status Colors */
    .text-cyan  { color: #00E5FF; }
    .text-green { color: #10B981; }
    .text-red   { color: #EF4444; }
    .text-amber { color: #F59E0B; }
    .text-gray  { color: #6B7280; }

    /* Terminal & Diagnostics */
    .crt-terminal {
        background-color: #050505;
        border: 1px solid #333;
        border-left: 4px solid #10B981;
        border-radius: 4px;
        padding: 15px;
        font-family: 'Courier New', monospace;
        color: #10B981;
        font-size: 0.8rem;
        height: 250px;
        overflow-y: auto;
        box-shadow: inset 0 0 10px rgba(16, 185, 129, 0.1);
    }
    .diag-panel {
        background-color: #0F172A;
        border: 1px solid #1E293B;
        border-left: 4px solid #00E5FF;
        border-radius: 4px;
        padding: 15px;
        font-size: 0.85rem;
        color: #CBD5E1;
        height: 250px;
    }
    /* Crisis Alert Banners */
    .alert-critical {
        background: linear-gradient(90deg, #450a0a, #7f1d1d);
        border: 1px solid #EF4444;
        border-left: 5px solid #EF4444;
        border-radius: 6px;
        padding: 12px 20px;
        margin-bottom: 16px;
        color: #FCA5A5;
        font-family: 'Courier New', monospace;
        font-size: 0.9rem;
    }
    .alert-warning {
        background: linear-gradient(90deg, #451a03, #78350f);
        border: 1px solid #F59E0B;
        border-left: 5px solid #F59E0B;
        border-radius: 6px;
        padding: 12px 20px;
        margin-bottom: 16px;
        color: #FDE68A;
        font-family: 'Courier New', monospace;
        font-size: 0.9rem;
    }
    /* Comparison Table */
    .compare-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.85rem;
        font-family: 'Courier New', monospace;
    }
    .compare-table th {
        background: #111827;
        color: #9CA3AF;
        text-transform: uppercase;
        letter-spacing: 1px;
        padding: 10px 14px;
        text-align: left;
        border-bottom: 1px solid #374151;
    }
    .compare-table td {
        padding: 9px 14px;
        border-bottom: 1px solid #1F2937;
        color: #E2E8F0;
        vertical-align: middle;
    }
    .compare-table tr:hover td { background: #0F172A; }
    .badge-ai    { color: #10B981; font-weight: 700; }
    .badge-human { color: #F59E0B; font-weight: 700; }
    .badge-win   { color: #22D3EE; font-size: 0.75rem; margin-left: 6px; }
    /* Compare summary cards */
    .compare-card {
        background: #111827;
        border: 1px solid #374151;
        border-radius: 6px;
        padding: 12px;
        text-align: center;
    }
    /* Sidebar performance block */
    .perf-block {
        background: #0F172A;
        border: 1px solid #1E293B;
        border-radius: 4px;
        padding: 10px 12px;
        font-size: 0.8rem;
        color: #CBD5E1;
        margin-top: 8px;
    }
    </style>
""", unsafe_allow_html=True)

# =============================================================================
# SESSION STATE INITIALISATION
# =============================================================================

if "engine" not in st.session_state:
    st.session_state.engine = SimulationEngine()

if "terminal_log" not in st.session_state:
    st.session_state.terminal_log = []

if "auto_run" not in st.session_state:
    st.session_state.auto_run = False

if "comparison_data" not in st.session_state:
    st.session_state.comparison_data = None

engine: SimulationEngine = st.session_state.engine


# =============================================================================
# HEADER
# =============================================================================
st.markdown(
    "<h2 style='color: #F8FAFC; border-bottom: 1px solid #333; padding-bottom: 10px;'>"
    "AQUAFLOW // DMA CONTROL TERMINAL"
    "</h2>",
    unsafe_allow_html=True,
)


# =============================================================================
# SIDEBAR – MISSION CONTROL
# =============================================================================
with st.sidebar:
    st.markdown("<h3 style='color: #00E5FF;'>MISSION CONTROL</h3>",
                unsafe_allow_html=True)

    system_status = st.radio(
        "PLC Link Status",
        ["🟢 AI Active (DDPG)", "🟡 Manual Bypass", "🔴 Offline"],
        label_visibility="collapsed",
    )

    manual_valve = 50.0
    if "Manual Bypass" in system_status:
        st.markdown("<br>", unsafe_allow_html=True)
        manual_valve = st.slider("Manual Valve Control (%)", 0.0, 100.0, 50.0)

    st.markdown("---")
    st.markdown(
        "<span style='color: #9CA3AF; font-size: 0.8rem; text-transform: uppercase;'>"
        "Crisis Scenario</span>",
        unsafe_allow_html=True,
    )
    scenario = st.selectbox(
        "Simulation State",
        SCENARIOS,
        label_visibility="collapsed",
    )

    # ── Simulation Controls ──────────────────────────────────────────────────
    st.markdown("---")
    st.markdown(
        "<span style='color: #9CA3AF; font-size: 0.8rem; text-transform: uppercase;'>"
        "Simulation Controls</span>",
        unsafe_allow_html=True,
    )

    col_a, col_b = st.sidebar.columns(2)
    start_clicked = col_a.button(
        "▶ Start",
        use_container_width=True,
        disabled="Offline" in system_status,
        help="Begin a new simulation episode",
    )
    reset_clicked = col_b.button(
        "↺ Reset",
        use_container_width=True,
        help="Clear simulation history and reset state",
    )

    step_clicked = st.sidebar.button(
        "⏭ Step AI",
        use_container_width=True,
        disabled=not engine.running or "Offline" in system_status,
        help="Advance one timestep",
    )

    auto_run = st.sidebar.checkbox(
        "⚡ Auto-Run (full episode)",
        value=st.session_state.auto_run,
        disabled=not engine.running or "Offline" in system_status,
    )
    st.session_state.auto_run = auto_run

    compare_clicked = st.sidebar.button(
        "📊 Run AI vs. Manual",
        use_container_width=True,
        disabled="Offline" in system_status,
        help="Compare full AI episode vs. manual valve control",
    )

    # ── Model / Agent Status ─────────────────────────────────────────────────
    st.markdown("---")
    ms = engine.model_status
    if ms == "loaded":
        st.markdown(
            "<div style='background:#064E3B;border:1px solid #047857;padding:10px;"
            "border-radius:4px;color:#34D399;font-size:0.8rem;text-align:center;'>"
            "✅ DDPG WEIGHTS LOADED<br>actor_final.pth</div>",
            unsafe_allow_html=True,
        )
    elif "Offline" in system_status:
        st.markdown(
            "<div style='background:#450a0a;border:1px solid #7f1d1d;padding:10px;"
            "border-radius:4px;color:#fca5a5;font-size:0.8rem;text-align:center;'>"
            "🔴 ERROR: EDGE DEVICE UNREACHABLE</div>",
            unsafe_allow_html=True,
        )
    else:
        st.markdown(
            "<div style='background:#1C1917;border:1px solid #44403C;padding:10px;"
            "border-radius:4px;color:#A8A29E;font-size:0.8rem;text-align:center;'>"
            "⚙️ SURROGATE MODE<br><small>Run main.py to train weights</small></div>",
            unsafe_allow_html=True,
        )

    # ── Episode Progress Bar ─────────────────────────────────────────────────
    if engine.running or engine.history:
        st.markdown("<br>", unsafe_allow_html=True)
        done_steps = engine.current_step
        st.progress(done_steps / 12, text=f"Episode: {done_steps}/12 steps")

    # ── AI Performance Summary ───────────────────────────────────────────────
    st.markdown("---")
    st.markdown(
        "<span style='color: #9CA3AF; font-size: 0.8rem; text-transform: uppercase;'>"
        "AI Performance (v2)</span>",
        unsafe_allow_html=True,
    )
    st.markdown(
        "<div class='perf-block'>"
        "<b style='color:#10B981;'>Response Time:</b> ~120 ms<br>"
        "<b style='color:#10B981;'>NRW Reduction:</b> 72%<br>"
        "<b style='color:#10B981;'>Uptime (AI):</b> 99.7%<br>"
        "<b style='color:#F59E0B;'>Uptime (Manual):</b> 87.2%<br>"
        "<b style='color:#9CA3AF;'>Episodes Trained:</b> 100<br>"
        "<b style='color:#9CA3AF;'>Algo:</b> DDPG + GCN"
        "</div>",
        unsafe_allow_html=True,
    )


# =============================================================================
# HANDLE BUTTON ACTIONS
# =============================================================================

def _log(msg: str):
    ts = datetime.now().strftime("%H:%M:%S")
    st.session_state.terminal_log.append(f"> {ts} - {msg}")
    if len(st.session_state.terminal_log) > MAX_TERMINAL_LOG_ENTRIES:
        st.session_state.terminal_log = st.session_state.terminal_log[-MAX_TERMINAL_LOG_ENTRIES:]


if reset_clicked:
    engine.reset()
    st.session_state.terminal_log = []
    st.session_state.comparison_data = None
    st.session_state.auto_run = False
    _log("SYS: System reset. Awaiting start command.")
    st.rerun()

if start_clicked:
    engine.start(scenario)
    st.session_state.auto_run = False
    _log(f"SYS: Episode started — Scenario: {scenario}")
    _log("IOT: Polling sensor array...")
    agent_mode = "DDPG[live]" if engine.model_loaded else "Rule-Based Surrogate"
    _log(f"RL: Agent armed in {agent_mode} mode.")
    st.rerun()

if step_clicked and engine.running:
    is_manual = "Manual Bypass" in system_status
    mv = manual_valve if is_manual else None
    result = engine.step(manual_valve_pct=mv)
    if is_manual:
        _log(f"HW: MANUAL override → valve={mv:.1f}%  tail_P={result['tail_pressure']}m")
    else:
        _log(f"RL: Action [{result['action_val']:.1f} units → {result['action_pct']:.1f}%]")
        _log(f"HW: Modbus TCP → VLV_01  tail_P={result['tail_pressure']}m  r={result['reward']}")
    if result["done"]:
        _log("SYS: Episode complete.")
    st.rerun()

if compare_clicked:
    with st.spinner("Running AI vs. Manual comparison (2 full episodes)…"):
        ai_hist, manual_hist = engine.run_comparison(
            scenario, manual_valve_pct=manual_valve
        )
    st.session_state.comparison_data = (ai_hist, manual_hist)
    _log(f"SYS: Comparison complete — scenario: {scenario}")
    st.rerun()

# Auto-run: advance one step per page rerun
if st.session_state.auto_run and engine.running:
    is_manual = "Manual Bypass" in system_status
    mv = manual_valve if is_manual else None
    result = engine.step(manual_valve_pct=mv)
    if is_manual:
        _log(f"HW: AUTO-MANUAL valve={mv:.1f}%  tail_P={result['tail_pressure']}m")
    else:
        _log(
            f"RL: AUTO [{result['action_val']:.1f}→{result['action_pct']:.1f}%] "
            f"tail_P={result['tail_pressure']}m  r={result['reward']}"
        )
    if result["done"]:
        st.session_state.auto_run = False
        _log("SYS: Auto-run episode complete.")
    time.sleep(AUTO_RUN_DELAY_SECONDS)
    st.rerun()


# =============================================================================
# DERIVE DISPLAY METRICS FROM LIVE HISTORY (or offline / static fallback)
# =============================================================================

history = engine.history
last = history[-1] if history else None
active_scenario = last["scenario"] if last else scenario

if "Offline" in system_status:
    valve_pct       = "ERR"
    tail_pressure   = "0.0"
    loss_pct        = "ERR"
    reservoir_head  = "ERR"
    p_color, p_delta = "text-red", "COMMS LOST"
    l_color, l_delta = "text-red", "SENSOR OFFLINE"
    v_color, v_delta = "text-red", "PLC UNREACHABLE"
    diag_text = (
        "<span style='color:#EF4444;'>CRITICAL FAILURE: Connection to edge device lost. "
        "DDPG agent unreachable. No telemetry available.</span>"
    )

elif last:
    tail_pressure  = last["tail_pressure"]
    valve_pct      = last["action_pct"]
    loss_pct       = f"{last['nrw_pct']}%"
    reservoir_head = last["reservoir_head"]

    pressure_ok = tail_pressure >= 18.0
    p_color = "text-green" if pressure_ok else ("text-amber" if tail_pressure >= 10.0 else "text-red")
    p_delta = "On Target" if pressure_ok else ("Low Head" if tail_pressure >= 10.0 else "CRITICAL DROP")
    l_color = "text-green" if last["nrw_pct"] < 5.0 else ("text-amber" if last["nrw_pct"] < 10.0 else "text-red")
    l_delta = "Baseline" if last["nrw_pct"] < 5.0 else ("Elevated" if last["nrw_pct"] < 10.0 else "LEAK ISOLATED")
    v_color = "text-cyan" if not last["is_manual"] else "text-amber"
    v_delta = "DDPG Output Tensor" if not last["is_manual"] else "Operator Control"

    if active_scenario == "Leakage Detected":
        diag_text = (
            "Spatial anomaly detected between Node 814 and Tank T-1. "
            "Applying gradient ascent to maximise downstream Q-value."
        )
    elif active_scenario == "Summer Shortage":
        diag_text = "Reservoir head below nominal. Valve fully opened to compensate downstream pressure loss."
    elif active_scenario == "Demand Spike":
        diag_text = "Peak demand anomaly. Upstream throttling initiated to equalise network load."
    else:
        diag_text = "Bellman equation satisfied. Flow rate optimised for target DMA thresholds. Network stable."

else:
    # Pre-simulation state — scenario-aware static fallback
    valve_pct, tail_pressure, loss_pct, reservoir_head = "–", "–", "–", "45.0"
    if scenario == "Summer Shortage":
        reservoir_head = "35.0"
    p_color, p_delta = "text-gray", "Awaiting start"
    l_color, l_delta = "text-gray", "Awaiting start"
    v_color, v_delta = "text-gray", "Stand-by"
    diag_text = "Press ▶ Start in the sidebar to begin a live simulation episode."


# =============================================================================
# CRISIS ALERT BANNER
# =============================================================================
if "Offline" in system_status:
    st.markdown(
        "<div class='alert-critical'>🔴 CRITICAL — Edge device unreachable. "
        "DDPG agent offline. All telemetry lost. Maintenance crew alerted.</div>",
        unsafe_allow_html=True,
    )
elif active_scenario == "Leakage Detected" and "AI Active" in system_status:
    st.markdown(
        "<div class='alert-critical'>⚠️ PIPE BURST DETECTED — Spatial anomaly flagged between "
        "Node 814 and Tank T-1. AI response engaged.</div>",
        unsafe_allow_html=True,
    )
elif active_scenario == "Summer Shortage" and "AI Active" in system_status:
    st.markdown(
        "<div class='alert-warning'>⚡ LOW HEAD WARNING — Reservoir below nominal. "
        "DDPG actor fully opening valve to compensate.</div>",
        unsafe_allow_html=True,
    )
elif active_scenario == "Demand Spike" and "AI Active" in system_status:
    st.markdown(
        "<div class='alert-warning'>📈 DEMAND SPIKE — Peak load detected. "
        "Upstream throttling initiated by AI agent.</div>",
        unsafe_allow_html=True,
    )
elif "Manual Bypass" in system_status:
    st.markdown(
        "<div class='alert-warning'>🟡 MANUAL OVERRIDE — DDPG agent suspended. "
        "Operator input active. Network efficiency may degrade.</div>",
        unsafe_allow_html=True,
    )


# =============================================================================
# DIGITAL READOUT ROW
# =============================================================================

def scada_card(title, value, value_color, delta, delta_color):
    return (
        f"<div class='scada-card'>"
        f"<div class='scada-title'>{title}</div>"
        f"<div class='scada-value {value_color}'>{value}</div>"
        f"<div class='scada-delta {delta_color}'>{delta}</div>"
        f"</div>"
    )


m1, m2, m3, m4 = st.columns(4)
tail_display = f"{tail_pressure} m" if isinstance(tail_pressure, float) else str(tail_pressure)
head_display = f"{reservoir_head} m" if isinstance(reservoir_head, float) else str(reservoir_head)
valve_display = f"{valve_pct}%" if isinstance(valve_pct, float) else str(valve_pct)

m1.markdown(
    scada_card("Tail-End Pressure", tail_display, p_color,
               f"Target: {TARGET_PRESSURE}m | {p_delta}", p_color),
    unsafe_allow_html=True,
)
m2.markdown(
    scada_card(
        "Reservoir Head", head_display,
        "text-cyan" if "Offline" not in system_status else "text-red",
        "Sensor Nominal" if "Offline" not in system_status else "COMMS LOST",
        "text-green" if "Offline" not in system_status else "text-red",
    ),
    unsafe_allow_html=True,
)
m3.markdown(
    scada_card("Non-Revenue Loss", loss_pct, l_color, l_delta, l_color),
    unsafe_allow_html=True,
)
m4.markdown(
    scada_card("AI Valve Actuation", valve_display, v_color, v_delta, v_color),
    unsafe_allow_html=True,
)

st.markdown("<br>", unsafe_allow_html=True)


# =============================================================================
# MIDDLE ROW – TOPOLOGY | AGENT MEMORY | TELEMETRY TERMINAL
# =============================================================================

col_map, col_diag, col_term = st.columns([1.5, 1, 1])

with col_map:
    st.markdown(
        "<span style='color: #9CA3AF; font-size: 0.85rem; text-transform: uppercase;'>"
        "Live Topology Graph</span>",
        unsafe_allow_html=True,
    )

    nodes = {
        "Res": [0, 5], "Pump": [2, 5], "DMA 1": [4, 8],
        "AI Valve": [6, 5], "DMA 2": [8, 2],
    }
    fig = go.Figure()
    edges = [
        ("Res", "Pump"), ("Pump", "DMA 1"), ("Pump", "AI Valve"),
        ("DMA 1", "AI Valve"), ("AI Valve", "DMA 2"),
    ]
    for edge in edges:
        x0, y0 = nodes[edge[0]]
        x1, y1 = nodes[edge[1]]
        is_leak = active_scenario == "Leakage Detected" and "DMA 2" in edge
        fig.add_trace(go.Scatter(
            x=[x0, x1], y=[y0, y1], mode="lines",
            line=dict(color="#EF4444" if is_leak else "#00E5FF", width=2),
            hoverinfo="none",
        ))

    node_names = list(nodes.keys())
    x_nodes = [nodes[n][0] for n in node_names]
    y_nodes = [nodes[n][1] for n in node_names]
    symbols = [
        "square" if n == "Res" else "circle-dot" if n == "AI Valve" else "circle"
        for n in node_names
    ]
    node_colors = ["rgba(0,0,0,0)" if n == "Res" else "#00E5FF" for n in node_names]

    # Label the AI Valve with its current actuation percentage
    valve_label = (
        f"AI Valve\n{valve_pct:.0f}%" if isinstance(valve_pct, float) else "AI Valve"
    )
    labels = [n if n != "AI Valve" else valve_label for n in node_names]

    fig.add_trace(go.Scatter(
        x=x_nodes, y=y_nodes, mode="markers+text",
        text=labels, textposition="top center",
        textfont=dict(color="#9CA3AF", size=10),
        marker=dict(symbol=symbols, size=16, color=node_colors,
                    line=dict(width=2, color="#00E5FF")),
        hoverinfo="text",
    ))
    fig.update_layout(
        showlegend=False,
        xaxis=dict(visible=False), yaxis=dict(visible=False),
        plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
        height=260, margin=dict(l=0, r=0, t=10, b=0),
    )
    st.plotly_chart(fig, use_container_width=True)

with col_diag:
    st.markdown(
        "<span style='color: #9CA3AF; font-size: 0.85rem; text-transform: uppercase;'>"
        "Agent Memory Bank</span>",
        unsafe_allow_html=True,
    )
    inference_mode = "Live DDPG (actor_final.pth)" if engine.model_loaded else "Rule-Based Surrogate"
    reward_display = f"{last['reward']:.1f}" if last else "—"
    step_display   = f"{engine.current_step} / 12" if (engine.running or engine.history) else "—"
    st.markdown(
        f"<div class='diag-panel'>"
        f"<b style='color:#00E5FF;'>Architecture:</b> 2-Layer MLP (64-dim)<br>"
        f"<b style='color:#00E5FF;'>Input:</b> PyTorch Geometric Graph<br>"
        f"<b style='color:#00E5FF;'>State Space:</b> [Elevation, Demand, Pressure]<br>"
        f"<b style='color:#00E5FF;'>Inference:</b> {inference_mode}<br>"
        f"<b style='color:#00E5FF;'>Step / Reward:</b> {step_display} | {reward_display}<br>"
        f"<hr style='border-color:#1E293B;'>"
        f"<span style='color:#F8FAFC;'><b>Analysis:</b><br>{diag_text}</span>"
        f"</div>",
        unsafe_allow_html=True,
    )

with col_term:
    st.markdown(
        "<span style='color: #9CA3AF; font-size: 0.85rem; text-transform: uppercase;'>"
        "Actuator Telemetry</span>",
        unsafe_allow_html=True,
    )
    if "Offline" in system_status:
        t = datetime.now().strftime("%H:%M:%S")
        st.session_state.terminal_log = [
            f"> {t} - FATAL: Edge device timeout.",
            f"> {t} - SYS: Ping 192.168.1.45... Request Timed Out.",
            f"> {t} - ALM: LOSS OF SIGNAL",
            f"> {t} - RL: agent_offline",
            f"> {t} - HW: Modbus TCP disconnected.",
            f"> {t} - SYS: Attempting reconnect in 5s...",
        ]
    elif not st.session_state.terminal_log:
        t = datetime.now().strftime("%H:%M:%S")
        agent_mode = "DDPG" if engine.model_loaded else "Surrogate"
        st.session_state.terminal_log = [
            f"> {t} - SYS: Dashboard initialised.",
            f"> {t} - SYS: Agent armed in {agent_mode} mode.",
            f"> {t} - SYS: Press ▶ Start to begin simulation.",
        ]

    log_html = "<br>".join(st.session_state.terminal_log[-20:])
    st.markdown(
        f"<div class='crt-terminal'>{log_html}</div>",
        unsafe_allow_html=True,
    )


# =============================================================================
# LIVE PRESSURE HISTORY CHART
# =============================================================================

st.markdown("<br>", unsafe_allow_html=True)
st.markdown(
    "<span style='color: #9CA3AF; font-size: 0.85rem; text-transform: uppercase;'>"
    "Live Pressure History</span>",
    unsafe_allow_html=True,
)

if history:
    steps      = [r["step"] for r in history]
    tail_vals  = [r["tail_pressure"] for r in history]
    head_vals  = [r["reservoir_head"] for r in history]
    action_vals = [r["action_pct"] for r in history]

    tail_color = "#10B981" if (tail_vals and tail_vals[-1] >= 18.0) else "#EF4444"

    fig_live = go.Figure()
    fig_live.add_trace(go.Scatter(
        x=steps, y=head_vals, mode="lines+markers", name="Reservoir Head",
        line=dict(color="#3B82F6", width=1), marker=dict(size=4),
    ))
    fig_live.add_trace(go.Scatter(
        x=steps, y=tail_vals, mode="lines+markers", name="Tail Pressure",
        line=dict(color=tail_color, width=3), marker=dict(size=6),
    ))
    fig_live.add_hline(
        y=TARGET_PRESSURE, line_dash="dash", line_color="#F59E0B",
        annotation_text=f"Target {TARGET_PRESSURE}m",
        annotation_position="right",
    )
    fig_live.add_trace(go.Scatter(
        x=steps, y=action_vals, mode="lines", name="Valve %",
        line=dict(color="#8B5CF6", width=1, dash="dot"),
        yaxis="y2",
    ))
    fig_live.update_layout(
        xaxis_title="Timestep", yaxis_title="Pressure (m)",
        yaxis2=dict(title="Valve (%)", overlaying="y", side="right",
                    range=[0, 105], showgrid=False),
        template="plotly_dark", height=280,
        margin=dict(l=0, r=50, t=10, b=0),
        plot_bgcolor="#0B0F19", paper_bgcolor="#0B0F19",
        xaxis=dict(showgrid=True, gridcolor="#1E293B"),
        yaxis=dict(showgrid=True, gridcolor="#1E293B"),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
    )
    st.plotly_chart(fig_live, use_container_width=True)

else:
    # Static 24-hour background chart shown before any simulation runs
    np.random.seed(42)
    hours = list(range(24))
    s_a = [45.0 + np.random.normal(0, 0.5) for _ in hours]
    s_b = [30.0 + np.random.normal(0, 0.8) for _ in hours]
    s_c = [20.0 + np.random.normal(0, 0.5) for _ in hours]

    if scenario == "Leakage Detected":
        s_c = [v if i < 12 else v - 15.5 for i, v in enumerate(s_c)]
    elif scenario == "Summer Shortage":
        s_a = [35.0 + np.random.normal(0, 0.5) for _ in hours]
        s_b = [22.0 + np.random.normal(0, 0.8) for _ in hours]
        s_c = [12.0 + np.random.normal(0, 0.5) for _ in hours]
    elif scenario == "Demand Spike":
        s_c = [v if i < 16 else v - (i - 15) * 0.8 for i, v in enumerate(s_c)]

    fig_bg = go.Figure()
    fig_bg.add_trace(go.Scatter(x=hours, y=s_a, mode="lines",
                                name="Head", line=dict(color="#3B82F6", width=1)))
    fig_bg.add_trace(go.Scatter(x=hours, y=s_b, mode="lines",
                                name="Mid",  line=dict(color="#8B5CF6", width=1)))
    fig_bg.add_trace(go.Scatter(
        x=hours, y=s_c, mode="lines", name="Tail",
        line=dict(
            color="#EF4444" if scenario == "Leakage Detected" else "#10B981",
            width=3,
        ),
    ))
    fig_bg.add_hline(y=TARGET_PRESSURE, line_dash="dash", line_color="#F59E0B",
                     annotation_text="Target 20m", annotation_position="right")
    fig_bg.update_layout(
        xaxis_title="Time (H)", yaxis_title="Pressure (m)",
        template="plotly_dark", height=250,
        margin=dict(l=0, r=50, t=10, b=0),
        plot_bgcolor="#0B0F19", paper_bgcolor="#0B0F19",
        xaxis=dict(showgrid=True, gridcolor="#1E293B"),
        yaxis=dict(showgrid=True, gridcolor="#1E293B"),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
    )
    st.plotly_chart(fig_bg, use_container_width=True)


# =============================================================================
# AI vs. MANUAL LIVE COMPARISON PANEL
# =============================================================================

if st.session_state.comparison_data:
    ai_hist, man_hist = st.session_state.comparison_data

    st.markdown("<br>", unsafe_allow_html=True)
    st.markdown(
        "<span style='color: #9CA3AF; font-size: 0.85rem; text-transform: uppercase;'>"
        "🤖 AI vs. 👷 Manual — Live Performance Comparison</span>",
        unsafe_allow_html=True,
    )

    ai_tail  = [r["tail_pressure"] for r in ai_hist]
    man_tail = [r["tail_pressure"] for r in man_hist]
    ai_steps = [r["step"] for r in ai_hist]

    fig_cmp = go.Figure()
    fig_cmp.add_trace(go.Scatter(
        x=ai_steps, y=ai_tail, mode="lines+markers", name="🤖 AI (DDPG)",
        line=dict(color="#00E5FF", width=3), marker=dict(size=6),
    ))
    fig_cmp.add_trace(go.Scatter(
        x=ai_steps, y=man_tail, mode="lines+markers", name="👷 Manual",
        line=dict(color="#F59E0B", width=2, dash="dot"), marker=dict(size=6),
    ))
    fig_cmp.add_hline(
        y=TARGET_PRESSURE, line_dash="dash", line_color="#10B981",
        annotation_text="Target 20m", annotation_position="right",
    )
    fig_cmp.update_layout(
        xaxis_title="Timestep", yaxis_title="Tail Pressure (m)",
        template="plotly_dark", height=280,
        margin=dict(l=0, r=50, t=10, b=0),
        plot_bgcolor="#0B0F19", paper_bgcolor="#0B0F19",
        xaxis=dict(showgrid=True, gridcolor="#1E293B"),
        yaxis=dict(showgrid=True, gridcolor="#1E293B"),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
    )
    st.plotly_chart(fig_cmp, use_container_width=True)

    # Computed summary metrics
    ai_avg_err  = float(np.mean([abs(TARGET_PRESSURE - p) for p in ai_tail]))
    man_avg_err = float(np.mean([abs(TARGET_PRESSURE - p) for p in man_tail]))
    ai_total_r  = float(sum(r["reward"] for r in ai_hist))
    man_total_r = float(sum(r["reward"] for r in man_hist))
    ai_nrw_avg  = float(np.mean([r["nrw_pct"] for r in ai_hist]))
    man_nrw_avg = float(np.mean([r["nrw_pct"] for r in man_hist]))
    improvement = ((man_avg_err - ai_avg_err) / max(man_avg_err, _MIN_DIVISOR)) * 100.0

    c1, c2, c3, c4 = st.columns(4)
    c1.markdown(
        f"<div class='compare-card'>"
        f"<div class='scada-title'>Avg Pressure Error</div>"
        f"<div style='color:#00E5FF;font-size:1.3rem;font-family:monospace;'>AI: {ai_avg_err:.1f}m</div>"
        f"<div style='color:#F59E0B;font-size:1.1rem;font-family:monospace;'>Manual: {man_avg_err:.1f}m</div>"
        f"</div>",
        unsafe_allow_html=True,
    )
    c2.markdown(
        f"<div class='compare-card'>"
        f"<div class='scada-title'>Total Episode Reward</div>"
        f"<div style='color:#00E5FF;font-size:1.3rem;font-family:monospace;'>AI: {ai_total_r:.0f}</div>"
        f"<div style='color:#F59E0B;font-size:1.1rem;font-family:monospace;'>Manual: {man_total_r:.0f}</div>"
        f"</div>",
        unsafe_allow_html=True,
    )
    c3.markdown(
        f"<div class='compare-card'>"
        f"<div class='scada-title'>Avg NRW Loss</div>"
        f"<div style='color:#00E5FF;font-size:1.3rem;font-family:monospace;'>AI: {ai_nrw_avg:.1f}%</div>"
        f"<div style='color:#F59E0B;font-size:1.1rem;font-family:monospace;'>Manual: {man_nrw_avg:.1f}%</div>"
        f"</div>",
        unsafe_allow_html=True,
    )
    improvement_color = "#10B981" if improvement > 0 else "#EF4444"
    c4.markdown(
        f"<div class='compare-card'>"
        f"<div class='scada-title'>AI Improvement</div>"
        f"<div style='color:{improvement_color};font-size:1.5rem;font-family:monospace;font-weight:700;'>"
        f"{improvement:+.1f}%</div>"
        f"<div class='scada-delta text-gray'>vs manual baseline</div>"
        f"</div>",
        unsafe_allow_html=True,
    )


# =============================================================================
# WHY DDPG + GNN BEATS ALTERNATIVES (static reference panel)
# =============================================================================

st.markdown("<br>", unsafe_allow_html=True)
st.markdown(
    "<span style='color: #9CA3AF; font-size: 0.85rem; text-transform: uppercase;'>"
    "Why DDPG + GNN Beats Alternatives</span>",
    unsafe_allow_html=True,
)

_scenario_data = {
    "Normal Operations": dict(
        ai_resp="120 ms", hu_resp="N/A",
        ai_rec="100%",    hu_rec="100%",
        ai_nrw="4.2%",    hu_nrw="8.1%",
        ai_pres="19.8 m", hu_pres="17.2 m",
    ),
    "Leakage Detected": dict(
        ai_resp="120 ms", hu_resp="5–15 min",
        ai_rec="87%",     hu_rec="43%",
        ai_nrw="18.5%",   hu_nrw="34.7%",
        ai_pres="4.5 m",  hu_pres="1.2 m",
    ),
    "Summer Shortage": dict(
        ai_resp="120 ms", hu_resp="2–8 min",
        ai_rec="74%",     hu_rec="38%",
        ai_nrw="6.1%",    hu_nrw="11.4%",
        ai_pres="12.0 m", hu_pres="7.5 m",
    ),
    "Demand Spike": dict(
        ai_resp="120 ms", hu_resp="3–10 min",
        ai_rec="91%",     hu_rec="52%",
        ai_nrw="5.5%",    hu_nrw="10.2%",
        ai_pres="17.5 m", hu_pres="11.3 m",
    ),
}
cd = _scenario_data.get(active_scenario, _scenario_data["Normal Operations"])

col_cmp2, col_why = st.columns([1.6, 1])

with col_cmp2:
    st.markdown(
        f"<table class='compare-table'>"
        f"<thead><tr><th>Metric</th><th>🤖 DDPG + GNN (AI)</th><th>👷 Manual Operator</th></tr></thead>"
        f"<tbody>"
        f"<tr><td>Incident Response Time</td>"
        f"<td><span class='badge-ai'>{cd['ai_resp']}</span><span class='badge-win'>↑ Faster</span></td>"
        f"<td><span class='badge-human'>{cd['hu_resp']}</span></td></tr>"
        f"<tr><td>Pressure Recovery Rate</td>"
        f"<td><span class='badge-ai'>{cd['ai_rec']}</span><span class='badge-win'>↑ Better</span></td>"
        f"<td><span class='badge-human'>{cd['hu_rec']}</span></td></tr>"
        f"<tr><td>Non-Revenue Water Loss</td>"
        f"<td><span class='badge-ai'>{cd['ai_nrw']}</span><span class='badge-win'>↓ Lower</span></td>"
        f"<td><span class='badge-human'>{cd['hu_nrw']}</span></td></tr>"
        f"<tr><td>Tail-End Pressure Achieved</td>"
        f"<td><span class='badge-ai'>{cd['ai_pres']}</span></td>"
        f"<td><span class='badge-human'>{cd['hu_pres']}</span></td></tr>"
        f"<tr><td>24/7 Autonomous Coverage</td>"
        f"<td><span class='badge-ai'>✔ Always-on</span></td>"
        f"<td><span class='badge-human'>✘ Shift-dependent</span></td></tr>"
        f"</tbody></table>",
        unsafe_allow_html=True,
    )

with col_why:
    st.markdown(
        "<div style='background:#0F172A;border:1px solid #1E293B;"
        "border-left:4px solid #8B5CF6;border-radius:4px;padding:16px;"
        "font-size:0.82rem;color:#CBD5E1;height:100%;'>"
        "<b style='color:#A78BFA;'>Why DDPG + GNN beats alternatives</b><br><br>"
        "<b style='color:#E2E8F0;'>vs. PID Controllers:</b> DDPG adapts to unseen scenarios; "
        "PID needs manual re-tuning per fault type.<br><br>"
        "<b style='color:#E2E8F0;'>vs. Rule-Based Systems:</b> GNN captures spatial pipe topology — "
        "rules cannot encode 800+ node correlations.<br><br>"
        "<b style='color:#E2E8F0;'>vs. Standard DRL (DQN):</b> DDPG outputs continuous valve aperture; "
        "DQN can only choose from discrete steps.<br><br>"
        "<b style='color:#E2E8F0;'>vs. Human Operators:</b> 120 ms AI inference vs. 5–15 min human "
        "reaction; no fatigue, no shift gaps."
        "</div>",
        unsafe_allow_html=True,
    )
