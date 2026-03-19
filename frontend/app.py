import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
from datetime import datetime
import time

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
    .text-cyan { color: #00E5FF; }
    .text-green { color: #10B981; }
    .text-red { color: #EF4444; }
    .text-amber { color: #F59E0B; }
    
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
    /* Crisis Alert Banner */
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
        animation: pulse-border 1.5s infinite;
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
    @keyframes pulse-border {
        0%, 100% { border-left-color: #EF4444; }
        50% { border-left-color: #FCA5A5; }
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
    .badge-ai   { color: #10B981; font-weight: 700; }
    .badge-human{ color: #F59E0B; font-weight: 700; }
    .badge-win  { color: #22D3EE; font-size: 0.75rem; margin-left: 6px; }
    /* Sidebar perf block */
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

# --- HEADER ---
st.markdown("<h2 style='color: #F8FAFC; border-bottom: 1px solid #333; padding-bottom: 10px;'>AQUAFLOW // DMA CONTROL TERMINAL</h2>", unsafe_allow_html=True)

# --- SIDEBAR (SYSTEM INJECTION) ---
# --- SIDEBAR (SYSTEM INJECTION) ---
with st.sidebar:
    st.markdown("<h3 style='color: #00E5FF;'>SYSTEM OVERRIDE</h3>",
                unsafe_allow_html=True)
    system_status = st.radio("PLC Link Status", [
                             "🟢 AI Active (DDPG)", "🟡 Manual Bypass", "🔴 Offline"], label_visibility="collapsed")

    # If Manual is selected, spawn a slider!
    manual_valve = 50.0
    if "Manual Bypass" in system_status:
        st.markdown("<br>", unsafe_allow_html=True)
        manual_valve = st.slider("Manual Valve Control (%)", 0.0, 100.0, 50.0)

    st.markdown("---")
    st.markdown("<span style='color: #9CA3AF; font-size: 0.8rem; text-transform: uppercase;'>Inject Simulation State</span>", unsafe_allow_html=True)
    scenario = st.selectbox(
        "Simulation State",
        ["Normal Operations", "Leakage Detected",
            "Summer Shortage", "Demand Spike"],
        label_visibility="collapsed"
    )

    if "AI Active" in system_status:
        st.markdown("<br><div style='background-color: #064E3B; border: 1px solid #047857; padding: 10px; border-radius: 4px; color: #34D399; font-size: 0.8rem; text-align: center;'>WEIGHTS LOADED: actor_final.pth</div>", unsafe_allow_html=True)
    elif "Offline" in system_status:
        st.markdown("<br><div style='background-color: #450a0a; border: 1px solid #7f1d1d; padding: 10px; border-radius: 4px; color: #fca5a5; font-size: 0.8rem; text-align: center;'>ERROR: EDGE DEVICE UNREACHABLE</div>", unsafe_allow_html=True)

    st.markdown("---")
    # Auto-refresh toggle for live dashboard feel
    auto_refresh = st.checkbox("⟳ Auto-Refresh (5s)", value=False)
    if auto_refresh:
        st.markdown("<span style='color: #34D399; font-size: 0.75rem;'>● Live feed active</span>", unsafe_allow_html=True)

    # Sidebar performance summary
    st.markdown("---")
    st.markdown("<span style='color: #9CA3AF; font-size: 0.8rem; text-transform: uppercase;'>AI Performance (v2)</span>", unsafe_allow_html=True)
    st.markdown("""
    <div class='perf-block'>
      <b style='color:#10B981;'>Response Time:</b> ~120 ms<br>
      <b style='color:#10B981;'>NRW Reduction:</b> 72%<br>
      <b style='color:#10B981;'>Uptime (AI):</b> 99.7%<br>
      <b style='color:#F59E0B;'>Uptime (Manual):</b> 87.2%<br>
      <b style='color:#9CA3AF;'>Episodes Trained:</b> 100<br>
      <b style='color:#9CA3AF;'>Algo:</b> DDPG + GCN
    </div>
    """, unsafe_allow_html=True)

# --- CRISIS ALERT BANNER ---
if "Offline" in system_status:
    st.markdown("<div class='alert-critical'>🔴 CRITICAL — Edge device unreachable. DDPG agent offline. All telemetry lost. Maintenance crew alerted.</div>", unsafe_allow_html=True)
elif scenario == "Leakage Detected" and "AI Active" in system_status:
    st.markdown("<div class='alert-critical'>⚠️  PIPE BURST DETECTED — Spatial anomaly flagged between Node 814 and Tank T-1. AI response engaged.</div>", unsafe_allow_html=True)
elif scenario == "Summer Shortage" and "AI Active" in system_status:
    st.markdown("<div class='alert-warning'>⚡ LOW HEAD WARNING — Reservoir below nominal. DDPG actor fully opening valve to compensate.</div>", unsafe_allow_html=True)
elif scenario == "Demand Spike" and "AI Active" in system_status:
    st.markdown("<div class='alert-warning'>📈 DEMAND SPIKE — Peak load detected. Upstream throttling initiated by AI agent.</div>", unsafe_allow_html=True)
elif "Manual Bypass" in system_status:
    st.markdown("<div class='alert-warning'>🟡 MANUAL OVERRIDE — DDPG agent suspended. Operator input active. Network efficiency may degrade.</div>", unsafe_allow_html=True)

# --- STATE MATH & LOGIC ---
if "Offline" in system_status:
    # Total System Failure
    valve_pct, tail_pressure, loss_pct = "ERR", "0.0", "ERR"
    p_color, p_delta, l_color, l_delta = "text-red", "COMMS LOST", "text-red", "SENSOR OFFLINE"
    v_color, v_delta = "text-red", "PLC UNREACHABLE"
    diag_text = "<span style='color:#EF4444;'>CRITICAL FAILURE: Connection to edge device lost. DDPG agent unreachable. No telemetry available.</span>"

elif "Manual Bypass" in system_status:
    # Human Operator Control
    valve_pct = manual_valve
    # Fake deterministic physics based on human input
    tail_pressure = round((manual_valve / 100.0) * 25.0,
                          1) if scenario != "Leakage Detected" else round((manual_valve / 100.0) * 10.0, 1)
    # Estimate non-revenue loss: manual control is inherently less efficient.
    # Baseline AI loss is 4.2%, optimal valve is ~46.1%, scaling factor 12.0 represents
    # the extra loss incurred per 100% of deviation from the AI-optimal aperture.
    estimated_loss = round(4.2 + (abs(manual_valve - 46.1) / 100.0) * 12.0, 1)
    loss_pct = f"~{estimated_loss}%"
    p_color, p_delta, l_color, l_delta = "text-amber", "Operator Control", "text-amber", "Unoptimized"
    v_color, v_delta = "text-amber", "Override Engaged"
    diag_text = "<span style='color:#F59E0B;'>WARNING: System in Manual Override. DDPG agent suspended. Modbus TCP receiving direct operator input. Network efficiency dropping.</span>"

else:
    # AI Control (Your existing logic)
    v_color, v_delta = "text-cyan", "DDPG Output Tensor"
    if scenario == "Normal Operations":
        valve_pct, tail_pressure, loss_pct = 46.1, 19.8, "4.2%"
        p_color, p_delta, l_color, l_delta = "text-cyan", "System Stable", "text-green", "Baseline"
        diag_text = "Bellman equation satisfied. Flow rate optimized for target DMA thresholds. Network stable."
    elif scenario == "Leakage Detected":
        valve_pct, tail_pressure, loss_pct = 78.4, 4.5, "18.5%"
        p_color, p_delta, l_color, l_delta = "text-red", "CRITICAL DROP", "text-red", "LEAK ISOLATED"
        diag_text = "Spatial anomaly detected between Node 814 and Tank T-1. Applying gradient ascent to maximize downstream Q-value."
    elif scenario == "Summer Shortage":
        valve_pct, tail_pressure, loss_pct = 100.0, 12.0, "6.1%"
        p_color, p_delta, l_color, l_delta = "text-amber", "Low Head Warning", "text-amber", "Elevated"
        diag_text = "Reservoir head below nominal. Valve fully opened to compensate downstream pressure loss."
    elif scenario == "Demand Spike":
        valve_pct, tail_pressure, loss_pct = 85.0, 17.5, "5.5%"
        p_color, p_delta, l_color, l_delta = "text-amber", "Throttling Active", "text-cyan", "Compensating"
        diag_text = "Peak demand anomaly. Upstream throttling initiated to equalize network load."

# --- DIGITAL READOUT ROW ---
m1, m2, m3, m4 = st.columns(4)


def scada_card(title, value, value_color, delta, delta_color):
    return f"""
    <div class='scada-card'>
        <div class='scada-title'>{title}</div>
        <div class='scada-value {value_color}'>{value}</div>
        <div class='scada-delta {delta_color}'>{delta}</div>
    </div>
    """


m1.markdown(scada_card("Tail-End Pressure", f"{tail_pressure} m" if tail_pressure !=
            "0.0" else "0.0 m", p_color, f"Target: 20.0m | {p_delta}", p_color), unsafe_allow_html=True)

# Reservoir Head: reflect actual head level per scenario
_res_offline = "Offline" in system_status
if _res_offline:
    _res_val, _res_color, _res_delta, _res_dcol = "ERR", "text-red", "COMMS LOST", "text-red"
elif scenario == "Summer Shortage":
    _res_val, _res_color, _res_delta, _res_dcol = "35.0 m", "text-amber", "Low Head Warning", "text-amber"
else:
    _res_val, _res_color, _res_delta, _res_dcol = "45.0 m", "text-cyan", "Sensor Nominal", "text-green"

m2.markdown(scada_card("Reservoir Head", _res_val, _res_color, _res_delta, _res_dcol), unsafe_allow_html=True)
m3.markdown(scada_card("Non-Revenue Loss", loss_pct, l_color,
            l_delta, l_color), unsafe_allow_html=True)
m4.markdown(scada_card("AI Valve Actuation", f"{valve_pct}%" if valve_pct !=
            "ERR" else "ERR", v_color, v_delta, v_color), unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)


# --- MIDDLE ROW (MAP, DIAGNOSTICS, TERMINAL) ---
col_map, col_diag, col_term = st.columns([1.5, 1, 1])

with col_map:
    st.markdown("<span style='color: #9CA3AF; font-size: 0.85rem; text-transform: uppercase;'>Live Topology Graph</span>", unsafe_allow_html=True)

    nodes = {'Res': [0, 5], 'Pump': [2, 5], 'DMA 1': [
        4, 8], 'AI Valve': [6, 5], 'DMA 2': [8, 2]}
    fig = go.Figure()
    edges = [('Res', 'Pump'), ('Pump', 'DMA 1'), ('Pump', 'AI Valve'),
             ('DMA 1', 'AI Valve'), ('AI Valve', 'DMA 2')]

    for edge in edges:
        x0, y0 = nodes[edge[0]]
        x1, y1 = nodes[edge[1]]
        line_color = '#EF4444' if scenario == "Leakage Detected" and 'DMA 2' in edge else '#00E5FF'
        fig.add_trace(go.Scatter(x=[x0, x1], y=[y0, y1], mode='lines', line=dict(
            color=line_color, width=2), hoverinfo='none'))

    x_nodes = [coords[0] for coords in nodes.values()]
    y_nodes = [coords[1] for coords in nodes.values()]
    node_names = list(nodes.keys())

    symbols = ['square' if n == 'Res' else 'circle-dot' if n ==
               'AI Valve' else 'circle' for n in node_names]
    colors = ['rgba(0,0,0,0)' if n == 'Res' else '#00E5FF' for n in node_names]

    fig.add_trace(go.Scatter(
        x=x_nodes, y=y_nodes, mode='markers+text', text=node_names, textposition="top center", textfont=dict(color="#9CA3AF", size=10),
        marker=dict(symbol=symbols, size=16, color=colors,
                    line=dict(width=2, color='#00E5FF')),
        hoverinfo='text'
    ))

    fig.update_layout(
        showlegend=False, xaxis=dict(visible=False), yaxis=dict(visible=False),
        plot_bgcolor='rgba(0,0,0,0)', paper_bgcolor='rgba(0,0,0,0)',
        height=260, margin=dict(l=0, r=0, t=10, b=0)
    )
    st.plotly_chart(fig, use_container_width=True)

with col_diag:
    st.markdown("<span style='color: #9CA3AF; font-size: 0.85rem; text-transform: uppercase;'>Agent Memory Bank</span>", unsafe_allow_html=True)

    st.markdown(f"""
    <div class='diag-panel'>
        <b style='color: #00E5FF;'>Architecture:</b> 2-Layer MLP (64-dim)<br>
        <b style='color: #00E5FF;'>Input:</b> PyTorch Geometric Graph<br>
        <b style='color: #00E5FF;'>State Space:</b> [Elevation, Demand, Pressure]<br><hr style='border-color: #1E293B;'>
        <span style='color: #F8FAFC;'><b>Analysis:</b><br>{diag_text}</span>
    </div>
    """, unsafe_allow_html=True)

with col_term:
    st.markdown("<span style='color: #9CA3AF; font-size: 0.85rem; text-transform: uppercase;'>Actuator Telemetry</span>", unsafe_allow_html=True)
    t = datetime.now().strftime("%H:%M:%S")
    if "Offline" in system_status:
        terminal_log = f"""> {t} - FATAL: Edge device timeout.
> {t} - SYS: Ping 192.168.1.45... Request Timed Out.
> {t} - ALM: LOSS OF SIGNAL
> {t} - RL: agent_offline
> {t} - HW: Modbus TCP disconnected.
> {t} - SYS: Attempting reconnect in 5s..."""
    elif "Manual Bypass" in system_status:
        terminal_log = f"""> {t} - SYS: OPERATOR OVERRIDE ENGAGED
> {t} - ALM: {scenario.upper()}
> {t} - RL: agent_suspended
> {t} - HW: Manual input received -> {valve_pct}%
> {t} - HW: Modbus TCP -> VLV_01
> {t} - SYS: Awaiting human input..."""
    else:
        terminal_log = f"""> {t} - SYS: Kernel initialized
> {t} - IOT: Polling sensor array...
> {t} - ALM: {scenario.upper()}
> {t} - RL: State Tensor Constructed
> {t} - RL: actor_final.pth inference
> {t} - RL: Action Out [ {valve_pct:.1f}% ]
> {t} - HW: Modbus TCP -> VLV_01
> {t} - HW: Actuator Sync Confirmed"""

    st.markdown(
        f"<div class='crt-terminal'>{terminal_log.replace(chr(10), '<br>')}</div>", unsafe_allow_html=True)
# --- BOTTOM ROW (LINE CHART) ---
st.markdown("<span style='color: #9CA3AF; font-size: 0.85rem; text-transform: uppercase;'>24-Hour Pressure Trend Analysis</span>", unsafe_allow_html=True)

np.random.seed(42)
hours = list(range(24))
s_a = [45.0 + np.random.normal(0, 0.5) for _ in hours]
s_b = [30.0 + np.random.normal(0, 0.8) for _ in hours]
s_c = [20.0 + np.random.normal(0, 0.5) for _ in hours]

if scenario == "Leakage Detected":
    s_c = [val if i < 12 else val - 15.5 for i, val in enumerate(s_c)]
elif scenario == "Summer Shortage":
    s_a = [35.0 + np.random.normal(0, 0.5) for _ in hours]
    s_b = [22.0 + np.random.normal(0, 0.8) for _ in hours]
    s_c = [12.0 + np.random.normal(0, 0.5) for _ in hours]
elif scenario == "Demand Spike":
    s_c = [val if i < 16 else val - (i-15)*0.8 for i, val in enumerate(s_c)]

fig_line = go.Figure()
fig_line.add_trace(go.Scatter(x=hours, y=s_a, mode='lines',
                   name='Head', line=dict(color='#3B82F6', width=1)))
fig_line.add_trace(go.Scatter(x=hours, y=s_b, mode='lines',
                   name='Mid', line=dict(color='#8B5CF6', width=1)))
fig_line.add_trace(go.Scatter(x=hours, y=s_c, mode='lines', name='Tail', line=dict(
    color='#EF4444' if scenario == "Leakage Detected" else '#10B981', width=3)))

fig_line.update_layout(
    xaxis_title="Time (H)", yaxis_title="Pressure (m)",
    template="plotly_dark", height=250, margin=dict(l=0, r=0, t=10, b=0),
    plot_bgcolor='#0B0F19', paper_bgcolor='#0B0F19',
    xaxis=dict(showgrid=True, gridcolor='#1E293B'), yaxis=dict(showgrid=True, gridcolor='#1E293B'),
    legend=dict(orientation="h", yanchor="bottom",
                y=1.02, xanchor="right", x=1)
)
st.plotly_chart(fig_line, use_container_width=True)

# --- AI vs HUMAN PERFORMANCE COMPARISON ---
st.markdown("<br>", unsafe_allow_html=True)
st.markdown("<span style='color: #9CA3AF; font-size: 0.85rem; text-transform: uppercase;'>AI vs Manual Operator — Performance Comparison</span>", unsafe_allow_html=True)

# Per-scenario comparison data
_scenario_data = {
    "Normal Operations":  dict(ai_resp="120 ms",  hu_resp="N/A",       ai_rec="100%",  hu_rec="100%",  ai_nrw="4.2%",  hu_nrw="8.1%",  ai_pres="19.8 m", hu_pres="17.2 m"),
    "Leakage Detected":   dict(ai_resp="120 ms",  hu_resp="5–15 min",  ai_rec="87%",   hu_rec="43%",   ai_nrw="18.5%", hu_nrw="34.7%", ai_pres="4.5 m",  hu_pres="1.2 m"),
    "Summer Shortage":    dict(ai_resp="120 ms",  hu_resp="2–8 min",   ai_rec="74%",   hu_rec="38%",   ai_nrw="6.1%",  hu_nrw="11.4%", ai_pres="12.0 m", hu_pres="7.5 m"),
    "Demand Spike":       dict(ai_resp="120 ms",  hu_resp="3–10 min",  ai_rec="91%",   hu_rec="52%",   ai_nrw="5.5%",  hu_nrw="10.2%", ai_pres="17.5 m", hu_pres="11.3 m"),
}
cd = _scenario_data.get(scenario, _scenario_data["Normal Operations"])

col_cmp, col_why = st.columns([1.6, 1])

with col_cmp:
    st.markdown(f"""
    <table class='compare-table'>
      <thead>
        <tr>
          <th>Metric</th>
          <th>🤖 DDPG + GNN (AI)</th>
          <th>👷 Manual Operator</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Incident Response Time</td>
          <td><span class='badge-ai'>{cd['ai_resp']}</span><span class='badge-win'>↑ Faster</span></td>
          <td><span class='badge-human'>{cd['hu_resp']}</span></td>
        </tr>
        <tr>
          <td>Pressure Recovery Rate</td>
          <td><span class='badge-ai'>{cd['ai_rec']}</span><span class='badge-win'>↑ Better</span></td>
          <td><span class='badge-human'>{cd['hu_rec']}</span></td>
        </tr>
        <tr>
          <td>Non-Revenue Water Loss</td>
          <td><span class='badge-ai'>{cd['ai_nrw']}</span><span class='badge-win'>↓ Lower</span></td>
          <td><span class='badge-human'>{cd['hu_nrw']}</span></td>
        </tr>
        <tr>
          <td>Tail-End Pressure Achieved</td>
          <td><span class='badge-ai'>{cd['ai_pres']}</span></td>
          <td><span class='badge-human'>{cd['hu_pres']}</span></td>
        </tr>
        <tr>
          <td>24/7 Autonomous Coverage</td>
          <td><span class='badge-ai'>✔ Always-on</span></td>
          <td><span class='badge-human'>✘ Shift-dependent</span></td>
        </tr>
      </tbody>
    </table>
    """, unsafe_allow_html=True)

with col_why:
    st.markdown("""
    <div style='background:#0F172A; border:1px solid #1E293B; border-left:4px solid #8B5CF6; border-radius:4px; padding:16px; font-size:0.82rem; color:#CBD5E1; height:100%;'>
      <b style='color:#A78BFA;'>Why DDPG + GNN beats alternatives</b><br><br>
      <b style='color:#E2E8F0;'>vs. PID Controllers:</b> DDPG adapts to unseen scenarios; PID needs manual re-tuning per fault type.<br><br>
      <b style='color:#E2E8F0;'>vs. Rule-Based Systems:</b> GNN captures spatial pipe topology — rules cannot encode 800+ node correlations.<br><br>
      <b style='color:#E2E8F0;'>vs. Standard DRL (DQN):</b> DDPG outputs continuous valve aperture; DQN can only choose from discrete steps.<br><br>
      <b style='color:#E2E8F0;'>vs. Human Operators:</b> 120 ms AI inference vs. 5–15 min human reaction; no fatigue, no shift gaps.
    </div>
    """, unsafe_allow_html=True)

# --- AUTO-REFRESH ---
# time.sleep keeps the rerun interval at 5 s without spinning; Streamlit's websocket
# remains open during the sleep so user interactions still trigger immediate reruns.
if auto_refresh:
    time.sleep(5)
    st.rerun()
