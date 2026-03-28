"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { Cpu, Network, Brain, Zap } from "lucide-react"

const pillars = [
  {
    icon: Network,
    title: "Digital Twin Simulation",
    description: "We build a live, physics-accurate digital replica of an entire city's water distribution network using EPANET/WNTR hydraulic modeling. Every pipe, valve, reservoir, and junction is simulated with real pressure, flow, and elevation data — creating a \"mirror world\" of the physical infrastructure.",
    features: ["785+ Network Nodes", "909 Pipe Segments", "Real-time Sync"],
    gradient: "from-cyan-500 to-blue-500",
    glowColor: "cyan"
  },
  {
    icon: Brain,
    title: "Graph Neural Network Intelligence",
    description: "Unlike traditional AI that sees data as flat tables, our GNN understands the water network as a connected graph — exactly the way pipes are connected in reality. It learns the topology, pressure cascades, and failure propagation patterns across hundreds of nodes simultaneously.",
    features: ["Topology Learning", "Cascade Prediction", "Pattern Recognition"],
    gradient: "from-emerald-500 to-teal-500",
    glowColor: "emerald"
  },
  {
    icon: Cpu,
    title: "Deep Reinforcement Learning",
    description: "Our AI agent is trained using Deep Deterministic Policy Gradient (DDPG) — the same class of algorithms used in robotics and autonomous driving. It learns optimal valve control strategies by running thousands of simulated crises.",
    features: ["DDPG Algorithm", "Autonomous Control", "Adaptive Response"],
    gradient: "from-violet-500 to-purple-500",
    glowColor: "violet"
  },
]

export function SolutionSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: "-100px" })

  return (
    <section ref={containerRef} className="relative py-32 overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-6">
            <Zap className="h-4 w-4 text-cyan-400" />
            <span className="text-sm text-cyan-400 font-medium">Our Solution</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-balance">
            An AI That Thinks<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">Faster Than Water Flows</span>
          </h2>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto text-pretty">
            HydroMind is a real-time AI crisis response system built on three powerful pillars
          </p>
        </motion.div>

        {/* Pillars */}
        <div className="space-y-8">
          {pillars.map((pillar, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: index % 2 === 0 ? -60 : 60 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              className={`relative group flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-8 items-center`}
            >
              {/* Visual */}
              <div className="w-full lg:w-1/2 relative">
                <div className={`aspect-square max-w-md mx-auto relative rounded-3xl bg-gradient-to-br ${pillar.gradient} p-[1px]`}>
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 to-transparent" />
                  <div className="relative h-full rounded-3xl bg-card/90 backdrop-blur-xl p-8 flex flex-col items-center justify-center">
                    {/* Animated icon */}
                    <motion.div
                      animate={{ 
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0]
                      }}
                      transition={{ 
                        duration: 4, 
                        repeat: Infinity,
                        repeatType: "reverse"
                      }}
                      className={`p-6 rounded-2xl bg-gradient-to-br ${pillar.gradient} shadow-lg`}
                    >
                      <pillar.icon className="h-16 w-16 text-white" />
                    </motion.div>
                    
                    {/* Floating particles */}
                    <div className="absolute inset-0 overflow-hidden rounded-3xl">
                      {[...Array(6)].map((_, i) => (
                        <motion.div
                          key={i}
                          className={`absolute w-2 h-2 rounded-full bg-${pillar.glowColor}-400/30`}
                          initial={{ 
                            x: Math.random() * 100 + '%',
                            y: Math.random() * 100 + '%',
                          }}
                          animate={{
                            y: [0, -20, 0],
                            opacity: [0.3, 0.8, 0.3]
                          }}
                          transition={{
                            duration: 2 + Math.random() * 2,
                            repeat: Infinity,
                            delay: Math.random() * 2
                          }}
                        />
                      ))}
                    </div>

                    {/* Feature badges */}
                    <div className="absolute bottom-6 left-6 right-6 flex flex-wrap gap-2 justify-center">
                      {pillar.features.map((feature, i) => (
                        <span 
                          key={i}
                          className="px-3 py-1 text-xs font-medium rounded-full bg-white/10 text-foreground/80 backdrop-blur-sm"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="w-full lg:w-1/2 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 mb-4">
                  <span className="text-sm text-muted-foreground">Pillar {index + 1}</span>
                </div>
                
                <h3 className="text-3xl md:text-4xl font-bold mb-4">{pillar.title}</h3>
                
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
