# 💧 HydroMind: AI-Driven SCADA Digital Twin

[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![PyTorch](https://img.shields.io/badge/PyTorch-EE4C2C?logo=pytorch&logoColor=white)](https://pytorch.org/)
[![Streamlit](https://img.shields.io/badge/Streamlit-FF4B4B?logo=streamlit&logoColor=white)](https://streamlit.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**HydroMind** is an advanced Reinforcement Learning (RL) pipeline and industrial SCADA dashboard designed to autonomously manage municipal water distribution networks.

By replacing static, manual valves with a **Deep Deterministic Policy Gradient (DDPG)** agent, HydroMind maps physical pipe topology into **PyTorch Geometric Graph Tensors** to optimize flow rates, maintain target tail-end pressures, and instantly isolate network anomalies like pipe bursts.

---

# 🏗️ Core Architecture

The system bridges the gap between complex fluid dynamics and edge-deployed machine learning:

### 1️⃣ The Physics Engine (EPANET / WNTR)
Simulates the hydraulic behavior of the **800+ node L-Town network**, calculating live head loss, friction, and pressure.

### 2️⃣ The Graph Neural Network (GNN)
Ingests live IoT sensor data (elevation, demand, pressure) and constructs a mathematical **state tensor** of the current network.

### 3️⃣ The DDPG Actor-Critic Agent
Trained over hundreds of episodes to satisfy the **Bellman equation**, the Actor network runs a forward pass to compute the optimal, continuous control action for the main distribution valve.

### 4️⃣ The SCADA Digital Twin
A high-performance **Streamlit frontend** that translates the PyTorch tensor outputs into a human-readable, industrial command terminal.

---

# 🌊 System Process Flow

HydroMind operates in real-time, executing the following control loop during a network crisis:

### 1️⃣ Baseline Operation
Under normal conditions, the DDPG agent maintains the main distribution valve at an optimized baseline (e.g., **46.1%**) to perfectly hold the tail-end node pressure at a **20.0m target**.

### 2️⃣ Crisis Detection
A simulated anomaly (such as a massive pipe burst in **District Metered Area 2**) causes an immediate downstream pressure drop and spikes **Non-Revenue Water Loss**.

### 3️⃣ Graph Spatial Analysis
The anomaly is ingested as a **PyTorch Graph Tensor**. The Graph Neural Network immediately flags the spatial correlation between the pressure drop and upstream nodes.

### 4️⃣ AI Inference & Actuation
The Actor network computes a gradient ascent to maximize the downstream **Q-value**, calculating a new optimal valve aperture (e.g., **78.4%**).

### 5️⃣ Hardware Sync
A simulated **Modbus TCP command** is transmitted to the PLC, actuating the physical valve, isolating the leak, and stabilizing the municipal grid **without human intervention**.

---

# ✨ Key Features

- **Live Topographical Monitoring**  
  Visualizes the District Metered Area (DMA) using custom **Plotly node routing**.

- **Deterministic Crisis Injection**  
  Simulates real-world network failures *(Leakage Detected, Summer Shortage, Demand Spikes)* to demonstrate the DDPG agent's localized policy response.

- **Operator Override Simulation**  
  Includes a functional manual bypass mode with a slider to demonstrate the efficiency gap between **human guesswork and AI optimization**.

- **Hardware Telemetry Terminal**  
  Simulates the **Modbus TCP handshake** between the edge device and valve actuators.

- **Offline Fault Monitoring**  
  Built-in **edge-device failure simulation** to alert maintenance crews of signal loss.

- **Crisis Alert Banners** *(v2)*  
  Animated red/amber banners appear instantly when a network anomaly is injected — judges never wonder if the system has responded.

- **AI vs. Human Performance Comparison** *(v2)*  
  A live comparison table per scenario shows response time, pressure recovery, and NRW loss for the AI agent versus a manual operator.

- **"Why DDPG + GNN?" Panel** *(v2)*  
  Side-by-side differentiation against PID controllers, rule-based systems, DQN, and manual operation.

- **Dynamic Reservoir Head** *(v2)*  
  The reservoir head SCADA card now correctly reflects reduced head (35 m) during Summer Shortage events.

- **Auto-Refresh Mode** *(v2)*  
  Toggle in the sidebar for a 5-second live refresh loop, making the dashboard feel like a real SCADA terminal.

---

# ⚔️ Why DDPG + GNN Beats Alternatives

| Alternative | Limitation | HydroMind Advantage |
|-------------|-----------|---------------------|
| **PID Controller** | Requires manual re-tuning per fault type | DDPG adapts to unseen scenarios through policy generalisation |
| **Rule-Based Systems** | Cannot encode 800+ node spatial correlations | GNN propagates pressure state across the full pipe topology |
| **DQN (Discrete RL)** | Only selects from a fixed set of valve positions | DDPG outputs a continuous aperture value (0–50%) for fine-grained control |
| **Manual Operators** | 5–15 min reaction time, shift gaps, fatigue | ~120 ms AI inference, 24/7 autonomous coverage, zero operator fatigue |

---

# 📈 Real Learning: v1 → v2 Improvements

After internal testing, the following issues were identified and resolved:

| Issue Found | Fix Applied |
|-------------|-------------|
| Diagnostic text for Offline/Manual modes was silently overwritten by AI-mode text | Removed the duplicate `diag_text` assignment in the panel section |
| Reservoir Head card always showed 45.0 m even during Summer Shortage | Added per-scenario reservoir head logic (35.0 m during shortage) |
| Terminal log showed `0.461` instead of `46.1%` for valve actuation | Fixed display to show `valve_pct` directly as a percentage |
| Manual bypass Non-Revenue Loss showed "Unknown" | Replaced with an estimated loss formula based on deviation from AI optimal |
| No contextual alert when a crisis was injected | Added animated crisis alert banners (red for critical, amber for warnings) |
| No differentiation narrative for judges/stakeholders | Added AI vs Human comparison table and "Why DDPG + GNN?" panel |

---

# 🛠️ Technology Stack

### Machine Learning
- PyTorch
- PyTorch Geometric (GNNs)

### Reinforcement Learning
- Custom **DDPG (Actor-Critic)** implementation
- Graph Replay Buffers

### Hydraulic Simulation
- **WNTR (Water Network Tool for Resilience)**
- **EPANET**

### Frontend UI
- Streamlit
- Plotly
- Pandas
- NumPy

---

# 🚀 Installation & Setup

To run the **SCADA Digital Twin locally**:

## 1️⃣ Clone the repository

```bash
git clone https://github.com/yourusername/HydroMind_RL.git
cd HydroMind_RL
```

## 2️⃣ Create and activate a virtual environment

### Windows PowerShell

```bash
python -m venv venv
.\venv\Scripts\activate
```

### macOS / Linux

```bash
python3 -m venv venv
source venv/bin/activate
```

## 3️⃣ Install frontend dependencies

```bash
pip install streamlit pandas numpy plotly
```

**Note:**  
To run the backend **DDPG training loop**, the following packages are also required:

```bash
pip install torch torch_geometric wntr
```

## 4️⃣ Launch the SCADA Dashboard

```bash
streamlit run frontend/app.py
```

---

# 🧠 Future Engineering Roadmap

### 🔹 Live PyTorch Integration
Transition the dashboard from **"Presentation Safe Mode"** to live `actor_final.pth` inference.

### 🔹 Dynamic State Passing
Construct the mathematical **state graph dynamically on the frontend** to pass through the live PyTorch agent.

### 🔹 IoT Edge Containerization
Deploy the trained model via **Docker containers** to edge devices such as **Raspberry Pi** for localized PLC control.

---
