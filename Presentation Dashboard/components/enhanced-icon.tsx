"use client"

import React from "react"
import { motion } from "framer-motion"

interface EnhancedIconProps {
  icon: React.ElementType
  color: string
  className?: string
  animate?: boolean
}

const colorGradients = {
  cyan: "from-cyan-400 to-blue-500",
  emerald: "from-emerald-400 to-teal-500",
  amber: "from-amber-400 to-orange-500",
  rose: "from-rose-400 to-pink-500",
  purple: "from-purple-400 to-indigo-500",
  green: "from-green-400 to-emerald-500",
  blue: "from-blue-400 to-cyan-500",
}

export function EnhancedIcon({
  icon: Icon,
  color = "cyan",
  className = "h-8 w-8",
  animate = true,
}: EnhancedIconProps) {
  const gradient = colorGradients[color as keyof typeof colorGradients] || colorGradients.cyan

  return (
    <motion.div
      initial={animate ? { scale: 0.8, opacity: 0 } : {}}
      animate={animate ? { scale: 1, opacity: 1 } : {}}
      transition={{ duration: 0.5 }}
      className="relative"
    >
      {/* Animated gradient background glow */}
      <motion.div
        animate={animate ? { 
          boxShadow: [
            `0 0 20px rgba(59, 130, 246, 0.5)`,
            `0 0 40px rgba(59, 130, 246, 0.3)`,
            `0 0 20px rgba(59, 130, 246, 0.5)`,
          ]
        } : {}}
        transition={animate ? { duration: 3, repeat: Infinity } : {}}
        className={`relative p-3 rounded-xl bg-gradient-to-br ${gradient} bg-opacity-10 backdrop-blur-sm`}
      >
        {/* Outer ring */}
        <motion.div
          animate={animate ? { rotate: 360 } : {}}
          transition={animate ? { duration: 8, repeat: Infinity, ease: "linear" } : {}}
          className="absolute inset-0 rounded-xl border-2 border-transparent bg-gradient-to-br opacity-30"
          style={{
            borderImage: `linear-gradient(45deg, var(--color1), var(--color2)) 1`,
          }}
        />

        {/* Icon with gradient text effect */}
        <div className={`relative ${className}`}>
          <Icon className={`h-full w-full text-transparent bg-clip-text bg-gradient-to-br ${gradient}`} />
        </div>

        {/* Inner pulse */}
        <motion.div
          animate={animate ? {
            opacity: [0.5, 1, 0.5],
            scale: [0.95, 1.05, 0.95],
          } : {}}
          transition={animate ? { duration: 2, repeat: Infinity } : {}}
          className={`absolute inset-2 rounded-lg bg-gradient-to-br ${gradient} opacity-0 blur-sm`}
        />
      </motion.div>
    </motion.div>
  )
}
