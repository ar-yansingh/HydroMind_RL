# 🌊 HydroMind_RL

### AI-Powered Smart Water Network Management System

[![Live Demo](https://img.shields.io/badge/🔴_Live_Demo-hydromind--inference--app-00c853.svg)](https://hydromind-inference-app.azurewebsites.net/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.95+-009688.svg)](https://fastapi.tiangolo.com/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0+-ee4c2c.svg)](https://pytorch.org/)
[![Azure](https://img.shields.io/badge/Deploy-Azure-blue.svg)](https://azure.microsoft.com/)

> 🔗 **Live Demo**: [hydromind-inference-app.azurewebsites.net](https://hydromind-inference-app.azurewebsites.net/)

**HydroMind_RL** is a real-time AI-driven SCADA Command Center and Digital Twin for urban water distribution networks. It uses a **Graph Neural Network (GNN)** trained via **Deep Deterministic Policy Gradient (DDPG)** reinforcement learning to autonomously detect anomalies — burst pipes, demand surges, supply shortages — and isolate affected zones by actuating smart valves in real time.

> Built on the **L-Town** 785-node benchmark water network, HydroMind simulates realistic hydraulic physics and allows operators to stress-test compound crisis scenarios, deploy AI recovery, and review detailed performance analysis.

---

## 📁 Repository Structure

This repository contains **two independent dashboards**:

| Folder | Purpose | Tech Stack |
|--------|---------|-----------|
| [`HydroMind Dashboard`](./HydroMind%20Dashboard) | **The main project** — Full-stack SCADA Command Center with real-time Digital Twin, AI agent, and operator controls | Python, FastAPI, PyTorch, React 19, Vite, Three.js, WebSockets |
| [`Presentation Dashboard`](./Presentation%20Dashboard) | **Presentation only** — Showcases the problem space: global water loss statistics, financial impacts, and the case for AI intervention | Next.js, TailwindCSS, shadcn/ui |

---

## 🧠 What is HydroMind Dashboard?

The core project. A fully functional AI-powered water network management system with three operational modes:

### Operator Mode
Real-time monitoring of the 785-node water network with live telemetry over WebSockets. Operators can inject anomalies (pipe ruptures, demand surges, supply shortages) and watch the GNN agent autonomously isolate threats, reroute flow, and stabilize pressure.

### Consumer Mode
A consumer-facing interface showing per-node water quality, pressure, and billing information. Useful for visualizing the downstream effects of network anomalies on individual households.

### Simulation Mode
A compound multi-scenario stress-testing engine. Randomly generates complex crisis events (simultaneous ruptures + surges ± supply shortages), lets the operator review the AI's planned recovery actions via a confirmation dialog, and grades the response on a multi-factor A–F scale covering pressure restoration, containment, response speed, and scenario difficulty.

### Key Technical Features
- **Physics Engine**: WNTR/EPANET hydraulic solver with spatial pressure propagation, surge cones, and downstream cascade effects
- **GNN-DDPG Agent**: Graph Neural Network processes network topology to compute optimal valve actuation strategies
- **Real-time Digital Twin**: Full 785-node network state streamed at 10 Hz via WebSocket
- **Canvas Map**: High-performance HTML5 Canvas renderer with minimap, zoom/pan, sector selection, and anomaly highlighting
- **City Map**: Leaflet-based geographic overlay of the network on real city tiles
- **Light/Dark Theme**: Full theme support across all modes

---

## 🎨 What is Presentation Dashboard?

A standalone Next.js web application designed for **presentations and demos**. It does **not** connect to the AI backend or run any simulation. Instead, it provides:

- Visual storytelling about global water loss (estimated 30–40% Non-Revenue Water worldwide)
- Financial impact statistics and infrastructure decay data
- The case for AI-driven water management as a solution
- Animated data visualizations and clean UI for stakeholder presentations

---

## 🛠️ Tech Stack

### HydroMind Dashboard (Main Project)

| Layer | Technologies |
|-------|-------------|
| **AI/ML** | PyTorch 2.0, PyTorch Geometric, DDPG, GNN (GraphSAGE) |
| **Simulation** | WNTR (Water Network Tool for Resilience), EPANET, Gymnasium |
| **Backend API** | FastAPI, Uvicorn, WebSockets, Pydantic |
| **Frontend** | React 19, Vite, TypeScript, Zustand, Three.js (React Three Fiber), Leaflet, Recharts |
| **Deployment** | Docker, Azure Web Apps, GitHub Actions |

### Presentation Dashboard

| Layer | Technologies |
|-------|-------------|
| **Framework** | Next.js |
| **Styling** | TailwindCSS, shadcn/ui |
| **Animations** | Framer Motion |

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.10+** with pip
- **Node.js 18+** with npm
- **Git**

### HydroMind Dashboard Setup

```bash
# Clone the repository
git clone https://github.com/ar-yansingh/HydroMind_RL.git
cd HydroMind_RL/HydroMind\ Dashboard
```

#### 1. Backend (FastAPI + Physics Engine + AI Agent)

```bash
# Create and activate virtual environment
python -m venv venv

# Windows:
venv\Scripts\activate
# macOS/Linux:
# source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Start the Digital Twin server
python server.py
# Backend runs on http://localhost:8000
```

#### 2. Frontend (React + Vite Command Center)

```bash
# In a new terminal
cd command-center
npm install
npm run dev
# Dashboard opens at http://localhost:5173
```

### Presentation Dashboard Setup

```bash
# From the repo root
cd Presentation\ Dashboard
npm install       # or pnpm install
npm run dev
# Opens at http://localhost:3000
```

---

## 🎮 Usage Guide

### Operator Mode
1. Open `http://localhost:5173` → **Operator** tab
2. Select a target node/pipe on the canvas map
3. Inject an anomaly: **Rupture**, **Surge**, or **Valve Failure**
4. Watch the GNN agent automatically isolate the threat and reroute flow
5. Monitor live metrics: pressure, valve actuation, leak rate, economic bleed

### Simulation Mode (Compound Stress Test)
1. Navigate to the **Simulation** tab
2. Click **Generate Scenario** — the engine creates a randomized compound crisis
3. Observe pulsing epicenters and surge cones on the map
4. Click **Deploy AI** → review the recovery plan preview → **Confirm & Deploy**
5. After stabilization, review the grade (A+ to F) and the detailed analysis

---

## ☁️ Deployment

The HydroMind Dashboard is optimized for **Azure Web Apps** via GitHub Actions.

```bash
# Build the Docker container
docker build -t hydromind-backend ./HydroMind\ Dashboard

# Run locally
docker run -p 8000:8000 hydromind-backend
```

The pre-configured `Dockerfile` in the HydroMind Dashboard folder starts the FastAPI server on port `8000`. Pushing to `main` can trigger Azure container builds via the included GitHub Actions workflow.

---

## 📄 License

This project is developed for academic and research purposes.
