"use client"

import { useRef, useState } from "react"
import { motion, useInView, AnimatePresence } from "framer-motion"
import { Code2, Server, Layout, Cloud, Database, Cpu, X, ChevronRight, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TechInfo {
  name: string
  description: string
  whyUsed: string
  link?: string
}

const techDetails: Record<string, TechInfo> = {
  // AI Engine
  "PyTorch": {
    name: "PyTorch",
    description: "An open-source machine learning framework developed by Meta AI. It provides a flexible and intuitive platform for building deep learning models with dynamic computational graphs.",
    whyUsed: "PyTorch is our foundation for building and training the neural network models that power HydroMind's predictive capabilities. Its dynamic graph computation allows rapid prototyping and debugging, essential for developing complex AI systems that need to adapt to real-world water network data.",
    link: "https://pytorch.org/"
  },
  "PyTorch Geometric (GNN)": {
    name: "PyTorch Geometric",
    description: "A library built on PyTorch for deep learning on irregular structures like graphs and point clouds. It provides efficient implementations of Graph Neural Network layers and utilities.",
    whyUsed: "Water distribution networks are inherently graph structures - nodes (junctions, valves) connected by edges (pipes). PyTorch Geometric allows our AI to understand the topology of the entire network, learning how pressure changes propagate through connected pipes and predicting failure cascades across hundreds of nodes simultaneously.",
    link: "https://pytorch-geometric.readthedocs.io/"
  },
  "DDPG Reinforcement Learning": {
    name: "Deep Deterministic Policy Gradient (DDPG)",
    description: "An actor-critic reinforcement learning algorithm designed for continuous action spaces. It combines the benefits of Q-learning with policy gradient methods for stable learning.",
    whyUsed: "Valve control requires continuous actions (how much to open/close) rather than discrete choices. DDPG enables our AI agent to learn optimal valve control strategies by simulating thousands of crisis scenarios, discovering counterintuitive solutions that human operators might miss - like partially closing an upstream valve to stabilize downstream pressure.",
    link: "https://arxiv.org/abs/1509.02971"
  },
  // Physics Simulation
  "WNTR (Water Network Tool for Resilience)": {
    name: "WNTR",
    description: "A Python package developed by Sandia National Laboratories for modeling water distribution network resilience. It extends EPANET capabilities with advanced analysis features.",
    whyUsed: "WNTR provides the physics-accurate simulation engine that creates our digital twin. It models hydraulic behavior including pressure-driven demand, pipe aging effects, and failure scenarios. This allows us to test AI responses in a safe simulated environment before deploying to real infrastructure.",
    link: "https://wntr.readthedocs.io/"
  },
  "EPANET": {
    name: "EPANET",
    description: "Industry-standard hydraulic modeling software developed by the US Environmental Protection Agency for water distribution system analysis.",
    whyUsed: "EPANET is the gold standard for water network simulation used by utilities worldwide. By building on EPANET, HydroMind's digital twin produces results that water engineers trust and can validate against their existing tools and real-world measurements.",
    link: "https://www.epa.gov/water-research/epanet"
  },
  // Backend
  "Python": {
    name: "Python",
    description: "A versatile, high-level programming language known for its readability and extensive ecosystem of scientific computing and AI libraries.",
    whyUsed: "Python is the lingua franca of AI/ML development. Its rich ecosystem (NumPy, Pandas, PyTorch) and rapid development capabilities allow us to prototype, test, and deploy AI models quickly while maintaining code that water infrastructure engineers can understand and audit.",
    link: "https://python.org/"
  },
  "FastAPI": {
    name: "FastAPI",
    description: "A modern, high-performance Python web framework for building APIs. It features automatic OpenAPI documentation, type validation, and async support.",
    whyUsed: "HydroMind requires sub-100ms response times for real-time crisis intervention. FastAPI's async architecture and minimal overhead ensure our AI decisions reach the control system instantly. Its automatic documentation also helps operators understand and trust the API endpoints they're relying on.",
    link: "https://fastapi.tiangolo.com/"
  },
  "WebSockets": {
    name: "WebSockets",
    description: "A protocol providing full-duplex communication channels over a single TCP connection, enabling real-time data streaming between server and client.",
    whyUsed: "Traditional HTTP polling would introduce unacceptable latency for a crisis response system. WebSockets enable continuous streaming of sensor data (785 nodes updating every 100ms) and instant push of AI decisions to the dashboard, creating the real-time situational awareness operators need.",
    link: "https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API"
  },
  "SQLite TSDB": {
    name: "SQLite Time-Series Database",
    description: "SQLite configured as a time-series database for storing and querying temporal sensor data efficiently with minimal infrastructure overhead.",
    whyUsed: "Water networks generate millions of data points daily. SQLite TSDB provides efficient storage and fast queries for historical trend analysis without the complexity of distributed databases. For our deployment scale, it offers the perfect balance of performance, simplicity, and reliability.",
  },
  // Frontend
  "React": {
    name: "React",
    description: "A JavaScript library for building user interfaces with a component-based architecture and efficient virtual DOM updates.",
    whyUsed: "The HydroMind dashboard needs to render 785+ network nodes with real-time updates while remaining responsive. React's virtual DOM efficiently handles these frequent updates, and its component model allows us to build reusable elements like node cards, pressure gauges, and trend charts.",
    link: "https://react.dev/"
  },
  "TypeScript": {
    name: "TypeScript",
    description: "A typed superset of JavaScript that compiles to plain JavaScript, adding static type definitions and enhanced tooling.",
    whyUsed: "In critical infrastructure software, type safety prevents bugs that could have serious consequences. TypeScript catches errors at compile time, ensures our API contracts are honored, and provides better documentation through type definitions - essential for a system operators depend on.",
    link: "https://www.typescriptlang.org/"
  },
  "Zustand": {
    name: "Zustand",
    description: "A small, fast, and scalable state management solution for React applications with a simple and intuitive API.",
    whyUsed: "The dashboard manages complex state: real-time sensor data, AI decisions, user selections, and crisis scenarios. Zustand provides lightweight global state management without Redux boilerplate, keeping our codebase maintainable while handling thousands of state updates per second.",
    link: "https://zustand-demo.pmnd.rs/"
  },
  "HTML5 Canvas": {
    name: "HTML5 Canvas",
    description: "A JavaScript API for drawing graphics and animations programmatically in web browsers, enabling high-performance 2D rendering.",
    whyUsed: "Rendering 785 nodes and 909 pipe connections with real-time color updates requires performance beyond what DOM elements can provide. Canvas gives us direct pixel control for smooth animations, custom visualizations, and the responsive network map that's central to the operator experience.",
    link: "https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API"
  },
  // Infrastructure
  "Docker": {
    name: "Docker",
    description: "A platform for developing, shipping, and running applications in isolated containers that package code with all dependencies.",
    whyUsed: "HydroMind needs to run consistently across development, testing, and production environments. Docker containers ensure the same Python version, library dependencies, and configurations are used everywhere, eliminating 'works on my machine' issues for critical infrastructure software.",
    link: "https://www.docker.com/"
  },
  "Azure Container Registry": {
    name: "Azure Container Registry",
    description: "A managed Docker registry service for storing and managing container images within the Azure cloud ecosystem.",
    whyUsed: "Secure, versioned storage of our Docker images enables reliable deployments and rollbacks. ACR's integration with Azure services provides enterprise-grade security and compliance features that water utilities require for their infrastructure systems.",
    link: "https://azure.microsoft.com/en-us/products/container-registry"
  },
  "Azure Web App": {
    name: "Azure Web App",
    description: "A fully managed platform for building, deploying, and scaling web applications with automatic patching and high availability.",
    whyUsed: "Azure Web Apps provides the 99.95% uptime SLA that critical infrastructure demands. Automatic scaling handles demand spikes during crisis events, while built-in monitoring and logging help us maintain the reliability that water utilities expect.",
    link: "https://azure.microsoft.com/en-us/products/app-service/web"
  },
  "GitHub Actions CI/CD": {
    name: "GitHub Actions",
    description: "An automation platform for software workflows including continuous integration and deployment pipelines directly in GitHub.",
    whyUsed: "Automated testing and deployment reduces human error in releasing updates to critical infrastructure. Our CI/CD pipeline runs hydraulic simulation tests, security scans, and staged deployments to ensure every update is thoroughly validated before reaching production.",
    link: "https://github.com/features/actions"
  },
  // Data
  "Real-world L-Town benchmark network": {
    name: "L-Town Benchmark Network",
    description: "A realistic water distribution network model used for benchmarking leak detection and water management algorithms, representing a medium-sized town.",
    whyUsed: "Rather than synthetic data, we train and validate HydroMind on the L-Town benchmark - a realistic network topology used by researchers worldwide. This ensures our AI generalizes to real-world conditions and allows comparison with other state-of-the-art approaches.",
  },
  "785 nodes": {
    name: "785 Network Nodes",
    description: "The total number of junctions, tanks, reservoirs, and monitoring points in the simulated water distribution network.",
    whyUsed: "This node count represents a realistic medium-sized city water network. Each node is a decision point where pressure and flow must be monitored and controlled, demonstrating HydroMind's ability to scale to real municipal infrastructure.",
  },
  "909 pipes": {
    name: "909 Pipe Segments",
    description: "The total number of pipe connections linking nodes in the network, each with specific diameter, length, and material properties.",
    whyUsed: "The pipe network forms the edges in our graph neural network. With 909 connections, the AI must understand how flow changes propagate through complex branching paths - essential for predicting where pressure drops will occur during a pipe burst.",
  },
}

const stack = [
  {
    layer: "AI Engine",
    icon: Cpu,
    technologies: ["PyTorch", "PyTorch Geometric (GNN)", "DDPG Reinforcement Learning"],
    color: "violet"
  },
  {
    layer: "Physics Simulation",
    icon: Server,
    technologies: ["WNTR (Water Network Tool for Resilience)", "EPANET"],
    color: "cyan"
  },
  {
    layer: "Backend",
    icon: Database,
    technologies: ["Python", "FastAPI", "WebSockets", "SQLite TSDB"],
    color: "emerald"
  },
  {
    layer: "Frontend",
    icon: Layout,
    technologies: ["React", "TypeScript", "Zustand", "HTML5 Canvas"],
    color: "blue"
  },
  {
    layer: "Infrastructure",
    icon: Cloud,
    technologies: ["Docker", "Azure Container Registry", "Azure Web App", "GitHub Actions CI/CD"],
    color: "amber"
  },
  {
    layer: "Data",
    icon: Code2,
    technologies: ["Real-world L-Town benchmark network", "785 nodes", "909 pipes"],
    color: "rose"
  },
]

const colorClasses: Record<string, { bg: string; text: string; border: string; glow: string; hover: string }> = {
  violet: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/30", glow: "shadow-violet-500/20", hover: "hover:bg-violet-500/20 hover:border-violet-500/50" },
  cyan: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30", glow: "shadow-cyan-500/20", hover: "hover:bg-cyan-500/20 hover:border-cyan-500/50" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", glow: "shadow-emerald-500/20", hover: "hover:bg-emerald-500/20 hover:border-emerald-500/50" },
  blue: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30", glow: "shadow-blue-500/20", hover: "hover:bg-blue-500/20 hover:border-blue-500/50" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30", glow: "shadow-amber-500/20", hover: "hover:bg-amber-500/20 hover:border-amber-500/50" },
  rose: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/30", glow: "shadow-rose-500/20", hover: "hover:bg-rose-500/20 hover:border-rose-500/50" },
}

function TechModal({ tech, color, onClose }: { tech: TechInfo; color: string; onClose: () => void }) {
  const colors = colorClasses[color]
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className={`relative max-w-xl w-full rounded-2xl bg-card border ${colors.border} shadow-2xl overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-6 ${colors.bg} border-b ${colors.border}`}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className={`text-2xl font-bold ${colors.text}`}>{tech.name}</h3>
              {tech.link && (
                <a
                  href={tech.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mt-1 transition-colors"
                >
                  <span>Official Documentation</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* What it is */}
          <div>
            <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <ChevronRight className={`h-4 w-4 ${colors.text}`} />
              What It Is
            </h4>
            <p className="text-muted-foreground leading-relaxed">
              {tech.description}
            </p>
          </div>

          {/* Why we use it */}
          <div>
            <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <ChevronRight className={`h-4 w-4 ${colors.text}`} />
              Why We Use It in HydroMind
            </h4>
            <p className="text-muted-foreground leading-relaxed">
              {tech.whyUsed}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className={`p-4 ${colors.bg} border-t ${colors.border} flex justify-end gap-3`}>
          {tech.link && (
            <Button
              asChild
              variant="outline"
              className={`${colors.border} ${colors.text}`}
            >
              <a href={tech.link} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Learn More
              </a>
            </Button>
          )}
          <Button
            onClick={onClose}
            variant="outline"
            className={`${colors.border}`}
          >
            Close
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function TechStackSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: "-100px" })
  const [selectedTech, setSelectedTech] = useState<{ tech: TechInfo; color: string } | null>(null)

  const handleTechClick = (techName: string, color: string) => {
    const techInfo = techDetails[techName]
    if (techInfo) {
      setSelectedTech({ tech: techInfo, color })
    }
  }

  return (
    <section ref={containerRef} className="relative py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-500/5 to-transparent" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-6">
            <Code2 className="h-4 w-4 text-violet-400" />
            <span className="text-sm text-violet-400 font-medium">Tech Stack</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-balance">
            Built With Modern<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-400">Scalable Architecture</span>
          </h2>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Click on any technology to learn what it is and why we chose it for HydroMind
          </p>
        </motion.div>

        {/* Stack grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stack.map((item, index) => {
            const colors = colorClasses[item.color]
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`group relative p-6 rounded-2xl bg-card/30 border ${colors.border} backdrop-blur-sm hover:bg-card/50 transition-all duration-300`}
              >
                <div className={`inline-flex p-3 rounded-xl ${colors.bg} mb-4`}>
                  <item.icon className={`h-6 w-6 ${colors.text}`} />
                </div>
                
                <h3 className="text-xl font-bold mb-4">{item.layer}</h3>
                
                <div className="flex flex-wrap gap-2">
                  {item.technologies.map((tech, i) => (
                    <button 
                      key={i}
                      onClick={() => handleTechClick(tech, item.color)}
                      className={`px-3 py-1.5 text-sm rounded-full ${colors.bg} ${colors.text} border ${colors.border} ${colors.hover} transition-all duration-200 cursor-pointer flex items-center gap-1.5`}
                    >
                      <span>{tech}</span>
                      <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
                
                {/* Glow effect */}
                <div className={`absolute inset-0 rounded-2xl ${colors.bg} opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300 -z-10`} />
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Tech Modal */}
      <AnimatePresence>
        {selectedTech && (
          <TechModal
            tech={selectedTech.tech}
            color={selectedTech.color}
            onClose={() => setSelectedTech(null)}
          />
        )}
      </AnimatePresence>
    </section>
  )
}
