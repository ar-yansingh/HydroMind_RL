# 🌊 HydroMind_RL: AI-Powered Smart Water Management

[![Azure Deploy](https://img.shields.io/badge/Deploy-Azure-blue.svg)](https://azure.microsoft.com/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.95+-009688.svg)](https://fastapi.tiangolo.com/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0+-ee4c2c.svg)](https://pytorch.org/)

**HydroMind_RL** is an advanced, AI-driven Digital Twin and SCADA Command Center designed to revolutionize municipal water distribution management. By bridging physics-based hydraulic simulation with deep reinforcement learning, HydroMind automatically identifies anomalies (burst pipes, massive demand surges, global supply drops) and autonomously isolates affected areas to minimize water loss and infrastructure damage.

## ✨ Core Features

- **Live Digital Twin**: Real-time simulation of the 785-node L-Town benchmark network, running full hydraulic propagation using the EPANET solver (WNTR).
- **Autonomous GNN Agent**: A highly-trained Graph Neural Network (DDPG) reinforcement learning agent autonomously calculates minimal-damage isolation strategies and actuates network valves to contain crises.
- **Compound Scenario Stress-Testing**: The physics engine supports simultaneous multi-target anomalies including cascading ruptures, 4x demand surges, and global supply shortages.
- **Dual Dashboard Architecture**: 
  1. **SCADA Command Center**: A high-performance, Three.js and Canvas-accelerated React dashboard for operators to oversee the network, manually deploy AI responses, and view detailed grade analyses.
  2. **Executive Presentation Dashboard**: A streamlined Streamlit interface designed to highlight live telemetry, financial damage from Non-Revenue Water (NRW), and the immediate ROI of AI recovery.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|-------|--------------|
| **AI & Simulation Backend** | Python 3.10, PyTorch, PyTorch Geometric, WNTR (EPANET), Gymnasium |
| **Backend API** | FastAPI, Uvicorn, WebSockets |
| **SCADA Command Center** | React 19, Vite, Three.js (React Three Fiber), Leaflet, TailwindCSS, Zustand |
| **Presentation Dashboard** | Streamlit, Plotly |

---

## 🚀 Quick Start (Local Development)

The HydroMind_RL system consists of three main components that need to be run concurrently for the full experience.

### 1. Backend (FastAPI + Physics Engine + AI)
The core backend handles the hydraulic simulation, WebSocket communication, and the DDPG reinforcement learning model.

```bash
# Clone the repository
git clone https://github.com/ar-yansingh/HydroMind_RL.git
cd HydroMind_RL

# Create virtual environment and activate
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the realtime Digital Twin server
python server.py
# Server runs on http://localhost:8000
```

### 2. SCADA Command Center (Main Interface)
The primary operator UI with live map visualizations and scenario stress-testing.

```bash
# Open a new terminal and navigate to the project root
cd HydroMind_RL/command-center

# Install dependencies
npm install

# Start the Vite development server
npm run dev
# Dashboard available at http://localhost:5173
```

### 3. Executive Presentation Dashboard
An alternative, presentation-focused UI that demonstrates the immediate financial impact of leaks and the AI's rapid recovery capabilities.

```bash
# Open a new terminal and navigate to the project root, activate venv
# venv\Scripts\activate

cd HydroMind_RL/frontend

# Run the Streamlit app
streamlit run app.py
# Dashboard available at http://localhost:8501
```

---

## 🎮 How to Use the System

### **Simulation Mode (Command Center)**
1. Open `http://localhost:5173` and navigate to the **Simulation** tab.
2. Click **Generate Scenario** to inject a compound multi-anomaly crisis into the Digital Twin. Watch the map highlight epicenters and downstream effects.
3. Click **Deploy AI** to preview the exact valves the GNN agent intends to close or open.
4. **Confirm & Deploy** to watch the AI stabilize the network in real-time. Review the resulting A-F grade analysis to understand network resilience.

### **Presentation Mode**
1. Open `http://localhost:8501`.
2. Click **INDUCE RUPTURE** to simulate a pipeline failure without AI intervention. Watch the financial damage skyrocket.
3. Click **DEPLOY PYTORCH AGENT** to witness the AI isolate the breach, stabilize system pressure, and halt economic bleeding.

---

## ☁️ Deployment

### Azure Web Apps Ready
This repository is optimized for deployment via GitHub Actions to Azure. The included pre-configured `Dockerfile` starts the FastAPI backend on port `8000`. Pushing to the `main` branch automatically triggers the container build workflow.

*Ensure your GitHub Action workflow has the build context set to `.` (project root).*
```yaml
docker build -t hydromind-backend .
```

### File Structure Overview
- `/backend/`: Digital Twin logic, WNTR physics wrappers, and the FastAPI WebSocket server.
- `/models/`: PyTorch definitions for the DDPG Agent and Graph Convolution network architectures.
- `/command-center/`: Source code for the comprehensive React/Vite operator SCADA dashboard.
- `/frontend/`: Source code for the lightweight Streamlit presentation application.
- `/data/`: L-Town benchmark graph structures and pre-trained `.pth` model weights.
