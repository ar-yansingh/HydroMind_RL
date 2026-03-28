"use client"

import { useRef, useState } from "react"
import { motion, useInView, AnimatePresence } from "framer-motion"
import { 
  Monitor, 
  Activity, 
  FileText, 
  AlertCircle, 
  Wrench, 
  MapPin, 
  TrendingUp,
  Shield,
  Eye,
  GitBranch,
  ExternalLink,
  X,
  ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { TiltCard } from "@/components/tilt-card"
import { NodeConnector } from "@/components/node-connector"
import { EnhancedIcon } from "@/components/enhanced-icon"

const dashboardFeatures = [
  {
    id: "network-map",
    icon: MapPin,
    title: "Interactive Network Map",
    shortDesc: "785+ node city visualization",
    color: "cyan",
    details: {
      headline: "Real-Time Tactical Network Visualization",
      description: "A comprehensive 785-node water distribution network displayed with live color-coded pressure states. Each node represents a junction, valve, or monitoring point in the city's water infrastructure.",
      capabilities: [
        "Live pressure visualization with color gradients (green = healthy, orange = warning, red = critical)",
        "909 pipe connections with flow direction indicators",
        "Click any node to see detailed telemetry data",
        "Pan, zoom, and navigate across the entire city network",
        "AI-highlighted zones showing active interventions"
      ],
      stats: { nodes: 785, pipes: 909, updateRate: "100ms" }
    }
  },
  {
    id: "telemetry",
    icon: Activity,
    title: "Real-Time Telemetry",
    shortDesc: "100ms update frequency",
    color: "emerald",
    details: {
      headline: "High-Frequency Sensor Data Streaming",
      description: "Every sensor in the network streams data at 100ms intervals, providing operators with instant visibility into pressure, flow rates, and valve positions across the entire distribution system.",
      capabilities: [
        "Pressure readings at every node (average 30.6m head)",
        "Flow rate monitoring (12,370+ L/s total system flow)",
        "Valve position status (open/closed/partial)",
        "Temperature and water quality parameters",
        "Historical trend graphs with 24-hour lookback"
      ],
      stats: { updateRate: "100ms", sensors: "2000+", dataPoints: "1M+/day" }
    }
  },
  {
    id: "ai-decisions",
    icon: FileText,
    title: "AI Decision Log",
    shortDesc: "Full audit trail",
    color: "purple",
    details: {
      headline: "Transparent AI Action Logging",
      description: "Every decision made by the HydroMind AI is logged with timestamps, reasoning, and outcomes. This provides full auditability and helps operators understand why specific actions were taken during crisis response.",
      capabilities: [
        "Timestamped action log with millisecond precision",
        "Decision reasoning with confidence scores",
        "Before/after network state comparisons",
        "Exportable reports for compliance and review",
        "Replay capability for training and analysis"
      ],
      stats: { logsRetained: "90 days", avgResponseTime: "12ms", accuracy: "99.7%" }
    }
  },
  {
    id: "crisis-console",
    icon: AlertCircle,
    title: "Crisis Console",
    shortDesc: "Scenario simulation",
    color: "rose",
    details: {
      headline: "One-Click Crisis Simulation & Response",
      description: "Test the system's response to various crisis scenarios including sector surges, supply drops, and critical ruptures. Watch as the AI instantly responds with optimal valve configurations and rerouting strategies.",
      capabilities: [
        "Sector Surge simulation - sudden pressure spikes",
        "Supply Drop scenarios - source failures",
        "Critical Rupture injection - pipe burst simulation",
        "Multi-node cascade failure testing",
        "Custom scenario builder for training exercises"
      ],
      stats: { scenarios: "15+", responseTime: "<50ms", recoveryRate: "94%" }
    }
  },
  {
    id: "status-monitor",
    icon: Shield,
    title: "System Status",
    shortDesc: "All-clear monitoring",
    color: "green",
    details: {
      headline: "Unified System Health Dashboard",
      description: "A single glance tells you everything about the network's health. The status panel aggregates data from all sensors to provide OPERATIONAL, WARNING, or CRITICAL status with detailed breakdowns by sector.",
      capabilities: [
        "Global system status indicator (OPERATIONAL/WARNING/CRITICAL)",
        "Sector-by-sector health breakdown",
        "Anomaly detection alerts with severity levels",
        "Maintenance schedule integration",
        "SLA compliance tracking"
      ],
      stats: { uptime: "99.99%", mttr: "12 min", sectors: "12" }
    }
  },
  {
    id: "pressure-trends",
    icon: TrendingUp,
    title: "Pressure Trends",
    shortDesc: "Historical analysis",
    color: "blue",
    details: {
      headline: "Predictive Pressure Analytics",
      description: "Track pressure trends across the network over time. The system identifies patterns, predicts demand spikes, and alerts operators to potential issues before they become critical.",
      capabilities: [
        "24-hour pressure trend visualization",
        "Demand prediction based on historical patterns",
        "Anomaly highlighting with root cause suggestions",
        "Peak demand forecasting",
        "Correlation analysis across network zones"
      ],
      stats: { predictionAccuracy: "96%", lookback: "30 days", alerts: "Real-time" }
    }
  },
  {
    id: "valve-control",
    icon: GitBranch,
    title: "Valve Control",
    shortDesc: "AI-assisted routing",
    color: "amber",
    details: {
      headline: "Intelligent Valve Orchestration",
      description: "The AI can control hundreds of valves simultaneously to isolate damaged zones, reroute flow around failures, and maintain pressure to critical facilities like hospitals during emergencies.",
      capabilities: [
        "Remote valve actuation with confirmation",
        "AI-recommended valve configurations",
        "Flow rerouting optimization",
        "Priority zone protection (hospitals, schools)",
        "Manual override capability for operators"
      ],
      stats: { valves: "200+", actuationTime: "<2s", autoResponses: "85%" }
    }
  },
  {
    id: "maintenance",
    icon: Wrench,
    title: "Maintenance Alerts",
    shortDesc: "Automated dispatch",
    color: "orange",
    details: {
      headline: "Proactive Maintenance Integration",
      description: "When the AI isolates a zone or detects equipment degradation, it automatically generates maintenance tickets with location, priority, and recommended actions for field crews.",
      capabilities: [
        "Automatic work order generation",
        "GPS coordinates for field crews",
        "Priority scoring based on impact",
        "Parts inventory integration",
        "Crew assignment optimization"
      ],
      stats: { avgDispatchTime: "3 min", ticketsPerMonth: "150+", preventive: "70%" }
    }
  }
]

const colorClasses: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  cyan: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30", glow: "shadow-cyan-500/20" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", glow: "shadow-emerald-500/20" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30", glow: "shadow-purple-500/20" },
  rose: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/30", glow: "shadow-rose-500/20" },
  green: { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/30", glow: "shadow-green-500/20" },
  blue: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30", glow: "shadow-blue-500/20" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30", glow: "shadow-amber-500/20" },
  orange: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30", glow: "shadow-orange-500/20" },
}

function FeatureModal({ feature, onClose }: { feature: typeof dashboardFeatures[0]; onClose: () => void }) {
  const colors = colorClasses[feature.color]
  
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
        className={`relative max-w-2xl w-full rounded-2xl bg-card border ${colors.border} shadow-2xl ${colors.glow} overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-6 ${colors.bg} border-b ${colors.border}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <EnhancedIcon 
                icon={feature.icon} 
                color={feature.color}
                className="h-6 w-6"
                animate={true}
              />
              <div>
                <h3 className="text-2xl font-bold text-foreground">{feature.details.headline}</h3>
                <p className={`text-sm ${colors.text} mt-1`}>{feature.title}</p>
              </div>
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
          <p className="text-muted-foreground leading-relaxed">
            {feature.details.description}
          </p>

          {/* Capabilities */}
          <div>
            <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">Key Capabilities</h4>
            <ul className="space-y-2">
              {feature.details.capabilities.map((cap, i) => (
                <li key={i} className="flex items-start gap-3">
                  <ChevronRight className={`h-4 w-4 ${colors.text} mt-1 flex-shrink-0`} />
                  <span className="text-sm text-muted-foreground">{cap}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(feature.details.stats).map(([key, value]) => (
              <div key={key} className={`p-3 rounded-xl ${colors.bg} border ${colors.border} text-center`}>
                <div className={`text-xl font-bold ${colors.text}`}>{value}</div>
                <div className="text-xs text-muted-foreground uppercase mt-1">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className={`p-4 ${colors.bg} border-t ${colors.border} flex justify-end`}>
          <Button
            onClick={onClose}
            variant="outline"
            className={`${colors.border} ${colors.text} hover:${colors.bg}`}
          >
            Close
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function DashboardSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: "-100px" })
  const [selectedFeature, setSelectedFeature] = useState<typeof dashboardFeatures[0] | null>(null)

  return (
    <section ref={containerRef} id="dashboard" className="relative py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-6">
            <Monitor className="h-4 w-4 text-cyan-400" />
            <span className="text-sm text-cyan-400 font-medium">SCADA Command Center</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-balance">
            Your Mission Control for<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">Urban Water Infrastructure</span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Experience real-time situational awareness with our AI-powered dashboard. 
            Monitor 785+ nodes, track pressure trends, and respond to crises in milliseconds.
          </p>

          {/* CTA to live dashboard */}
          <motion.a
            href="https://hydromind-inference-app.azurewebsites.net/"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-semibold text-lg hover:from-cyan-400 hover:to-emerald-400 transition-all shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-105"
          >
            <Eye className="h-5 w-5" />
            Launch Live Dashboard
            <ExternalLink className="h-4 w-4" />
          </motion.a>
        </motion.div>

        {/* Dashboard preview mockup */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, delay: 0.3 }}
          className="relative mb-16"
        >
          {/* Browser frame with dashboard image */}
          <div className="rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm overflow-hidden shadow-2xl shadow-cyan-500/10">
            {/* Header bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-card/80 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                </div>
                <div className="text-lg font-bold">
                  <span className="text-cyan-400">HydroMind</span>
                  <span className="text-muted-foreground text-sm ml-2">SCADA Command Center</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-sm font-medium">MONITORING</span>
                <span className="text-muted-foreground text-sm">T8912</span>
                <span className="text-foreground">15:45:35</span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-emerald-400 text-sm">LIVE</span>
                </span>
              </div>
            </div>

            {/* Dashboard screenshot */}
            <div className="relative">
              <img 
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-ZpfsKtngLHaOzgSoKtLj5wAEED3ODr.png"
                alt="HydroMind SCADA Command Center Dashboard showing network visualization"
                className="w-full h-auto"
              />
              {/* Overlay with "View Live" prompt */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1a] via-transparent to-transparent flex items-end justify-center pb-8">
                <a
                  href="https://hydromind-inference-app.azurewebsites.net/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 rounded-full bg-card/90 border border-cyan-500/30 text-cyan-400 hover:bg-card hover:border-cyan-500/50 transition-all backdrop-blur-sm"
                >
                  <Eye className="h-4 w-4" />
                  <span className="font-medium">Click to view live dashboard</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feature icons grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mb-8"
        >
          <h3 className="text-2xl font-bold text-center mb-8">
            Click to explore dashboard features
          </h3>
        </motion.div>

        <NodeConnector className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {dashboardFeatures.map((feature, index) => {
            const colors = colorClasses[feature.color]
            const glowColors: Record<string, string> = {
              cyan: "rgba(14, 165, 233, 0.3)",
              emerald: "rgba(16, 185, 129, 0.3)",
              purple: "rgba(168, 85, 247, 0.3)",
              rose: "rgba(244, 63, 94, 0.3)",
              green: "rgba(34, 197, 94, 0.3)",
              blue: "rgba(59, 130, 246, 0.3)",
              amber: "rgba(245, 158, 11, 0.3)",
              orange: "rgba(249, 115, 22, 0.3)",
            }
            return (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.6 + index * 0.08 }}
              >
                <TiltCard 
                  glowColor={glowColors[feature.color]}
                  className="h-full"
                >
                  <button
                    data-node-card={feature.id}
                    onClick={() => setSelectedFeature(feature)}
                    className={`group p-6 rounded-2xl ${colors.bg} border ${colors.border} backdrop-blur-sm transition-all duration-300 hover:shadow-lg ${colors.glow} text-left w-full h-full min-h-[200px] flex flex-col`}
                  >
                    <div className="mb-4 w-fit">
                      <EnhancedIcon 
                        icon={feature.icon} 
                        color={feature.color}
                        className="h-6 w-6"
                        animate={true}
                      />
                    </div>
                    <h4 className="font-bold text-lg text-foreground mb-2">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground flex-1">{feature.shortDesc}</p>
                    <div className={`mt-4 flex items-center gap-1 text-sm ${colors.text} opacity-0 group-hover:opacity-100 transition-opacity font-medium`}>
                      <span>Learn more</span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </button>
                </TiltCard>
              </motion.div>
            )
          })}
        </NodeConnector>

        {/* Key metrics with tilt effect */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 1 }}
          className="mt-16"
        >
          <NodeConnector className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: "785", label: "Network Nodes", color: "cyan" },
              { value: "909", label: "Pipe Connections", color: "emerald" },
              { value: "100ms", label: "Update Rate", color: "purple" },
              { value: "99.7%", label: "AI Accuracy", color: "amber" },
            ].map((stat, i) => {
              const colors = colorClasses[stat.color]
              const glowColors: Record<string, string> = {
                cyan: "rgba(14, 165, 233, 0.3)",
                emerald: "rgba(16, 185, 129, 0.3)",
                purple: "rgba(168, 85, 247, 0.3)",
                amber: "rgba(245, 158, 11, 0.3)",
              }
              return (
                <TiltCard key={i} glowColor={glowColors[stat.color]} maxTilt={10}>
                  <div 
                    data-node-card={`metric-${i}`}
                    className={`p-6 rounded-2xl ${colors.bg} border ${colors.border} text-center`}
                  >
                    <div className={`text-4xl font-bold ${colors.text}`}>{stat.value}</div>
                    <div className="text-sm text-muted-foreground mt-2">{stat.label}</div>
                  </div>
                </TiltCard>
              )
            })}
          </NodeConnector>
        </motion.div>
      </div>

      {/* Feature modal */}
      <AnimatePresence>
        {selectedFeature && (
          <FeatureModal
            feature={selectedFeature}
            onClose={() => setSelectedFeature(null)}
          />
        )}
      </AnimatePresence>
    </section>
  )
}
