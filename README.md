# 🌊 HydroMind_RL: SCADA Command Center & Digital Twin

[![Azure Deploy](https://img.shields.io/badge/Deploy-Azure-blue.svg)](https://azure.microsoft.com/)
[![React](https://img.shields.io/badge/React-18.x-61dafb.svg)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.95+-009688.svg)](https://fastapi.tiangolo.com/)

**HydroMind_RL** is an AI-powered SCADA Command Center designed for real-time water distribution network management. It combines a **Graph Neural Network (GNN)-based Reinforcement Learning agent** with a Digital Twin physics simulator to automatically identify anomalies (burst pipes, massive demand surges, global supply drops) and immediately isolate affected areas by taking control of smart valves across the grid.

## ✨ Features

- **Live Digital Twin**: Simulates the 785-node L-Town benchmark network with full hydraulic propagation.
- **Multi-Target Physics Engine**: Simulates cascading failures, massive sector surges (4x demand), and realistic spatial pressure drops.
- **Autonomous GNN Agent**: Automatically calculates minimum damage isolation strategies (DDPG) and closes valves in real-time.
- **Premium Command Dashboard**: High-performance HTML5 Canvas map, multi-element scenario injection, real-time live telemetry over WebSockets, and economic bleed trackers.

---

## 🚀 Quick Start (Local Development)

### 1. Backend (FastAPI + Physics Engine)
Requires Python 3.10+, PyTorch Geometric, WNTR.

```bash
# Clone the repository
git clone https://github.com/ar-yansingh/HydroMind_RL.git
cd HydroMind_RL

# Create virtual environment and install
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt

# Start the realtime Digital Twin server
python server.py
# Server runs on http://localhost:8000
```

### 2. Frontend (React + Vite)
Requires Node 18+.

```bash
cd command-center
npm install
npm run dev
# Dashboard available at http://localhost:5173
```

---

## ☁️ Azure Deployment

This repository is optimized for **Azure Web Apps** via GitHub Actions.

The pre-configured Dockerfile starts the FastAPI Digital Twin backend on port `8000`. 
By default, pushing to `main` triggers the Azure container build!

*Make sure your GitHub Action workflow has the build context set to `.` rather than `./inference`:*
```yaml
docker build -t ... .
```
