"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Droplets, 
  Network, 
  Brain, 
  Gauge, 
  Activity,
  Shield,
  MapPin,
  Zap
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface TourStep {
  id: string
  title: string
  description: string
  icon: React.ElementType
  targetSection: string
  highlight: string
  color: string
}

const tourSteps: TourStep[] = [
  {
    id: "hero",
    title: "Welcome to HydroMind",
    description: "An AI-powered crisis response system that protects cities from catastrophic water loss. Let us show you how it works.",
    icon: Droplets,
    targetSection: "hero",
    highlight: "Real-time monitoring and autonomous response",
    color: "cyan"
  },
  {
    id: "problem",
    title: "The ₹40 Crore+ Crisis",
    description: "Cities lose 30-50% of treated water due to undetected leaks and slow manual responses. HydroMind solves this with AI.",
    icon: Activity,
    targetSection: "problem",
    highlight: "126 billion liters wasted globally per day",
    color: "rose"
  },
  {
    id: "solution",
    title: "Three Pillar Architecture",
    description: "Digital Twin simulation + Graph Neural Networks + Deep Reinforcement Learning = Autonomous crisis response.",
    icon: Brain,
    targetSection: "solution",
    highlight: "Physics-accurate network simulation",
    color: "emerald"
  },
  {
    id: "how-it-works",
    title: "60-Second Recovery",
    description: "Detect anomalies, analyze the network topology, isolate the rupture, and reroute flow - all in under a minute.",
    icon: Zap,
    targetSection: "how-it-works",
    highlight: "Faster than water can flow",
    color: "amber"
  },
  {
    id: "dashboard",
    title: "SCADA Command Center",
    description: "A real-time dashboard showing 785+ network nodes, pressure telemetry, AI decisions, and crisis simulation controls.",
    icon: MapPin,
    targetSection: "dashboard",
    highlight: "Live at hydromind-inference-app.azurewebsites.net",
    color: "purple"
  },
  {
    id: "impact",
    title: "Real-World Impact",
    description: "Reduce NRW by 40%, protect hospitals and critical infrastructure, and save millions in treated water costs.",
    icon: Shield,
    targetSection: "impact",
    highlight: "Every liter saved = carbon reduced",
    color: "green"
  },
  {
    id: "tech",
    title: "Modern Tech Stack",
    description: "Built with PyTorch, GNN, DDPG, WNTR, FastAPI, React, and deployed on Azure with CI/CD via GitHub Actions.",
    icon: Network,
    targetSection: "tech-stack",
    highlight: "Open source on GitHub",
    color: "blue"
  }
]

const colorClasses: Record<string, { bg: string; border: string; text: string }> = {
  cyan: { bg: "bg-cyan-500/20", border: "border-cyan-500/50", text: "text-cyan-400" },
  emerald: { bg: "bg-emerald-500/20", border: "border-emerald-500/50", text: "text-emerald-400" },
  purple: { bg: "bg-purple-500/20", border: "border-purple-500/50", text: "text-purple-400" },
  rose: { bg: "bg-rose-500/20", border: "border-rose-500/50", text: "text-rose-400" },
  amber: { bg: "bg-amber-500/20", border: "border-amber-500/50", text: "text-amber-400" },
  green: { bg: "bg-green-500/20", border: "border-green-500/50", text: "text-green-400" },
  blue: { bg: "bg-blue-500/20", border: "border-blue-500/50", text: "text-blue-400" },
}

export function FeatureWalkthrough() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [hasSeenTour, setHasSeenTour] = useState(true)

  useEffect(() => {
    // Check if user has seen the tour before
    const seen = localStorage.getItem("hydromind-tour-seen")
    if (!seen) {
      setHasSeenTour(false)
    }
  }, [])

  const startTour = useCallback(() => {
    setIsOpen(true)
    setCurrentStep(0)
    // Scroll to hero section
    document.getElementById("hero")?.scrollIntoView({ behavior: "smooth" })
  }, [])

  const nextStep = useCallback(() => {
    if (currentStep < tourSteps.length - 1) {
      const nextIndex = currentStep + 1
      setCurrentStep(nextIndex)
      // Scroll to target section
      const targetId = tourSteps[nextIndex].targetSection
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" })
    } else {
      closeTour()
    }
  }, [currentStep])

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      const prevIndex = currentStep - 1
      setCurrentStep(prevIndex)
      const targetId = tourSteps[prevIndex].targetSection
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" })
    }
  }, [currentStep])

  const closeTour = useCallback(() => {
    setIsOpen(false)
    setHasSeenTour(true)
    localStorage.setItem("hydromind-tour-seen", "true")
  }, [])

  const step = tourSteps[currentStep]
  const colors = colorClasses[step.color]

  return (
    <>
      {/* Tour Start Button */}
      <motion.button
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.5, duration: 0.5 }}
        onClick={startTour}
        className="fixed top-24 right-6 z-40 flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 backdrop-blur-md border border-cyan-500/30 text-cyan-400 hover:from-cyan-500/30 hover:to-emerald-500/30 transition-all"
      >
        <Gauge className="h-4 w-4" />
        <span className="text-sm font-medium">Take Tour</span>
        {!hasSeenTour && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-500 rounded-full animate-ping" />
        )}
      </motion.button>

      {/* Tour Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={closeTour}
            />

            {/* Tour Card */}
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4"
            >
              <div className={`relative p-6 rounded-2xl bg-card/95 backdrop-blur-xl border ${colors.border} shadow-2xl`}>
                {/* Close button */}
                <button
                  onClick={closeTour}
                  className="absolute top-4 right-4 p-1 rounded-full hover:bg-secondary/50 transition-colors"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>

                {/* Progress dots */}
                <div className="flex items-center justify-center gap-2 mb-6">
                  {tourSteps.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setCurrentStep(index)
                        document.getElementById(tourSteps[index].targetSection)?.scrollIntoView({ behavior: "smooth" })
                      }}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentStep
                          ? `${colors.bg} ${colors.border} border w-6`
                          : index < currentStep
                          ? "bg-muted-foreground/50"
                          : "bg-muted-foreground/20"
                      }`}
                    />
                  ))}
                </div>

                {/* Step content */}
                <div className="text-center">
                  <div className={`inline-flex p-3 rounded-xl ${colors.bg} ${colors.border} border mb-4`}>
                    <step.icon className={`h-6 w-6 ${colors.text}`} />
                  </div>
                  
                  <h3 className="text-xl font-bold text-foreground mb-2">{step.title}</h3>
                  <p className="text-muted-foreground mb-4 leading-relaxed">{step.description}</p>
                  
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${colors.bg} ${colors.border} border text-sm ${colors.text}`}>
                    <Zap className="h-3 w-3" />
                    {step.highlight}
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={prevStep}
                    disabled={currentStep === 0}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </Button>
                  
                  <span className="text-sm text-muted-foreground">
                    {currentStep + 1} of {tourSteps.length}
                  </span>
                  
                  <Button
                    size="sm"
                    onClick={nextStep}
                    className={`gap-1 ${
                      currentStep === tourSteps.length - 1
                        ? "bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600"
                        : ""
                    }`}
                  >
                    {currentStep === tourSteps.length - 1 ? "Finish" : "Next"}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Spotlight effect on current section */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse 800px 600px at 50% 30%, transparent 0%, rgba(0,0,0,0.4) 100%)`
              }}
            />
          </>
        )}
      </AnimatePresence>
    </>
  )
}
