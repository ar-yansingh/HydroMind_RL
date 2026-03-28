"use client"

import { useRef } from "react"
import { motion, useInView, useScroll, useTransform } from "framer-motion"
import { Radar, BarChart3, Shield, RefreshCw, ArrowRight } from "lucide-react"

const steps = [
  {
    number: "01",
    icon: Radar,
    title: "Detect",
    description: "The Digital Twin continuously monitors pressure telemetry across all 785+ network nodes. The moment a pressure anomaly is detected — whether it's a pipe rupture, a demand surge, or a reservoir failure — the system triggers an alert.",
    color: "cyan",
    details: ["Real-time monitoring", "785+ nodes tracked", "Instant anomaly detection"]
  },
  {
    number: "02",
    icon: BarChart3,
    title: "Analyze",
    description: "The GNN processes the network topology in real-time, identifying: the epicenter of the crisis, which downstream nodes are affected, which critical infrastructure (hospitals, schools) is at risk, and which alternative flow paths exist.",
    color: "emerald",
    details: ["Topology analysis", "Impact assessment", "Path optimization"]
  },
  {
    number: "03",
    icon: Shield,
    title: "Isolate",
    description: "The AI agent autonomously closes valves around the rupture zone, cutting off the leak while preserving supply to unaffected areas. Flow and pressure at the epicenter drop to zero — surgically, not by shutting down the entire grid.",
    color: "amber",
    details: ["Surgical isolation", "Zero collateral damage", "Autonomous control"]
  },
  {
    number: "04",
    icon: RefreshCw,
    title: "Recover",
    description: "The system identifies optimal alternative flow paths to maintain supply to critical zones, dynamically adjusting valve apertures across the network to balance pressure and prevent secondary failures.",
    color: "violet",
    details: ["Dynamic rerouting", "Pressure balancing", "Secondary prevention"]
  },
]

export function HowItWorksSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: "-100px" })
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
    layoutEffect: false
  })
  
  const lineHeight = useTransform(scrollYProgress, [0.1, 0.9], ["0%", "100%"])

  return (
    <section ref={containerRef} className="relative py-32 overflow-hidden" style={{ position: 'relative' }}>
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
            <RefreshCw className="h-4 w-4 text-emerald-400" />
            <span className="text-sm text-emerald-400 font-medium">How It Works</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-balance">
            From Crisis to Recovery<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">in Under 60 Seconds</span>
          </h2>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Animated line */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-border/30 md:-translate-x-1/2">
            <motion.div 
              style={{ height: lineHeight }}
              className="w-full bg-gradient-to-b from-cyan-500 via-emerald-500 to-violet-500"
            />
          </div>

          {/* Steps */}
          <div className="space-y-16 md:space-y-24">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 60 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8, delay: index * 0.15 }}
                className={`relative flex flex-col ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-8 md:gap-16`}
              >
                {/* Timeline node */}
                <div className="absolute left-8 md:left-1/2 w-4 h-4 md:-translate-x-1/2 z-10">
                  <div className={`w-full h-full rounded-full bg-${step.color}-500 shadow-lg shadow-${step.color}-500/50`}>
                    <div className={`absolute inset-0 rounded-full bg-${step.color}-500 animate-ping opacity-25`} />
                  </div>
                </div>

                {/* Content */}
                <div className={`w-full md:w-1/2 pl-20 md:pl-0 ${index % 2 === 0 ? 'md:pr-16 md:text-right' : 'md:pl-16 md:text-left'}`}>
                  <div className={`inline-flex items-center gap-3 mb-4 ${index % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>
                    <span className={`text-6xl font-bold text-${step.color}-500/20`}>{step.number}</span>
                  </div>
                  
                  <h3 className="text-3xl md:text-4xl font-bold mb-4 flex items-center gap-3">
                    <step.icon className={`h-8 w-8 text-${step.color}-400 md:hidden`} />
                    {step.title}
                  </h3>
                  
                  <p className="text-lg text-muted-foreground leading-relaxed mb-4">
                    {step.description}
                  </p>

                  <div className={`flex flex-wrap gap-2 ${index % 2 === 0 ? 'md:justify-end' : 'md:justify-start'}`}>
                    {step.details.map((detail, i) => (
                      <span 
                        key={i}
                        className={`px-3 py-1 text-sm rounded-full bg-${step.color}-500/10 text-${step.color}-400 border border-${step.color}-500/20`}
                      >
                        {detail}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Visual card */}
                <div className={`hidden md:block w-1/2 ${index % 2 === 0 ? 'pl-16' : 'pr-16'}`}>
                  <div className={`relative p-8 rounded-2xl bg-card/50 border border-${step.color}-500/20 backdrop-blur-sm`}>
                    <div className={`inline-flex p-4 rounded-xl bg-${step.color}-500/10 mb-4`}>
                      <step.icon className={`h-10 w-10 text-${step.color}-400`} />
                    </div>
                    
                    <div className="space-y-3">
                      {step.details.map((detail, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <ArrowRight className={`h-4 w-4 text-${step.color}-400`} />
                          <span className="text-foreground">{detail}</span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Glow effect */}
                    <div className={`absolute inset-0 rounded-2xl bg-${step.color}-500/5 blur-xl -z-10`} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
