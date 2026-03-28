"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"

const evidenceItems = [
  { value: "50%", label: "WATER LOST", rotation: -3, top: "10%", left: "5%", image: "/images/water-leak.jpg" },
  { value: "₹20,000 Cr", label: "ANNUAL LOSS", rotation: 2, top: "15%", right: "8%", image: "/images/pressure-gauge.jpg" },
  { value: "126B L/day", label: "GLOBAL WASTE", rotation: -1, bottom: "20%", left: "10%", image: "/images/flood-street.jpg" },
  { value: "600M+", label: "INDIANS AT RISK", rotation: 4, bottom: "15%", right: "5%", image: "/images/drought-earth.jpg" },
]

export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true })

  return (
    <section ref={containerRef} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Cork board background */}
      <div className="absolute inset-0 cork-board" />

      {/* Subtle grain overlay */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='300' height='300' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E")`
      }} />

      {/* Red string connecting elements */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-[1]" style={{ opacity: 0.4 }}>
        <line x1="15%" y1="30%" x2="50%" y2="50%" stroke="#cc2222" strokeWidth="1.5" strokeDasharray="8 4" />
        <line x1="85%" y1="25%" x2="50%" y2="50%" stroke="#cc2222" strokeWidth="1.5" strokeDasharray="8 4" />
        <line x1="20%" y1="75%" x2="50%" y2="50%" stroke="#cc2222" strokeWidth="1.5" strokeDasharray="8 4" />
        <line x1="80%" y1="80%" x2="50%" y2="50%" stroke="#cc2222" strokeWidth="1.5" strokeDasharray="8 4" />
      </svg>

      {/* Floating evidence labels */}
      {evidenceItems.map((item, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.8 + index * 0.2 }}
          className="absolute hidden lg:block z-[2]"
          style={{
            top: item.top,
            left: item.left,
            right: item.right,
            bottom: item.bottom,
            transform: `rotate(${item.rotation}deg)`,
          }}
        >
          <div className="paper-card p-3 push-pin max-w-[180px] animate-paper-rustle" style={{ '--rotation': `${item.rotation}deg` } as React.CSSProperties}>
            <img src={item.image} alt={item.label} className="w-full h-16 object-cover grayscale contrast-125 opacity-70 mb-2" />
            <div className="text-2xl font-bold text-[#8b0000] newspaper-headline">{item.value}</div>
            <div className="text-xs text-[#5a5246] handwritten tracking-wider mt-1">{item.label}</div>
          </div>
        </motion.div>
      ))}

      {/* Main content — Central newspaper headline */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Top classified stamp */}
        <motion.div
          initial={{ opacity: 0, scale: 2 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <span className="classified-stamp animate-stamp">⚠ ACTIVE INVESTIGATION</span>
        </motion.div>

        {/* Main headline — torn newspaper style */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="newspaper-clipping inline-block p-8 md:p-12 mb-8"
          style={{ transform: "rotate(-0.5deg)" }}
        >
          <h1 className="newspaper-headline text-5xl md:text-7xl lg:text-8xl mb-4">
            THE <span className="text-[#8b0000]">INVISIBLE</span> CRISIS
          </h1>
          <div className="w-full h-[3px] bg-[#1a1a1a] mb-4" />
          <p className="typewriter text-lg md:text-xl text-[#5a5246] max-w-3xl mx-auto leading-relaxed">
            An Investigation into India&apos;s ₹20,000 Crore Water Infrastructure Failure — 
            <span className="evidence-underline"> Where treated water vanishes before reaching a single household</span>
          </p>
        </motion.div>

        {/* Sub-evidence line */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mb-12"
        >
          <p className="handwritten text-base text-[#5a5246] max-w-2xl mx-auto">
            Tracking the catastrophic failures of manual water management systems — 
            and the AI-powered solution that could save billions of liters daily.
          </p>
        </motion.div>

        {/* CTA styled as evidence labels */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a href="#problems" className="paper-card px-8 py-4 handwritten text-lg text-[#8b0000] hover:bg-[#f0e6d0] transition-colors border-2 border-[#8b0000] font-bold tracking-wide">
            📋 EXAMINE THE EVIDENCE
          </a>
          <a
            href="https://hydromind-inference-app.azurewebsites.net/"
            target="_blank"
            rel="noopener noreferrer"
            className="paper-card-aged px-8 py-4 handwritten text-lg text-[#5a5246] hover:bg-[#e8dcc8] transition-colors tracking-wide"
          >
            🔗 VIEW LIVE SYSTEM →
          </a>
        </motion.div>

        {/* Stats bar — evidence items on mobile */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 1 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 lg:hidden"
        >
          {evidenceItems.map((item, index) => (
            <div key={index} className="paper-card p-4 text-center" style={{ transform: `rotate(${item.rotation * 0.5}deg)` }}>
              <div className="text-xl font-bold text-[#8b0000] newspaper-headline">{item.value}</div>
              <div className="text-xs text-[#5a5246] handwritten tracking-wider mt-1">{item.label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="handwritten text-xs text-[#5a5246] uppercase tracking-[0.2em]">Scroll to investigate</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-[#8b0000] text-xl"
        >
          ▼
        </motion.div>
      </motion.div>
    </section>
  )
}
