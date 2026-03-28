"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"

/* ───────────────────────────────────────────
   DATA: OPERATOR CAPABILITIES
   ─────────────────────────────────────────── */
const operatorCapabilities = [
  {
    before: "Paper maps, no real-time view",
    after: "785-node live network visualization",
    detail: "Every junction, valve, and pipe rendered in real-time with color-coded pressure states. Green = healthy, orange = warning, red = critical."
  },
  {
    before: "6+ hour manual leak detection",
    after: "Instant AI anomaly detection",
    detail: "The GNN processes network topology and detects pressure anomalies the moment they occur—no more waiting for citizen complaints."
  },
  {
    before: "Phone-based emergency coordination",
    after: "One-click crisis simulation & response",
    detail: "Simulate Rupture, Surge, or Shortage scenarios with a single click. The AI deploys autonomous agents to reroute water and isolate failures."
  },
  {
    before: "No priority infrastructure tracking",
    after: "Critical facility protection",
    detail: "Hospitals, schools, fire stations are flagged as priority nodes. The AI ensures they maintain safe pressure thresholds even during crises."
  },
  {
    before: "Guesswork pressure management",
    after: "Real-time pressure & flow monitoring",
    detail: "Average 30.7m pressure head, 12,384 L/s total flow, 909 active pipes — all visible at a glance with historical trend analysis."
  },
]

/* ───────────────────────────────────────────
   DATA: CONSUMER CAPABILITIES
   ─────────────────────────────────────────── */
const consumerCapabilities = [
  {
    feature: "Real-Time Pressure & Quality Gauges",
    detail: "Visual speedometer-style gauges showing current water pressure (in metres) and quality score (/100). Know instantly if your supply is healthy, low, or critical."
  },
  {
    feature: "Usage Tracking & Billing",
    detail: "Daily usage (18,648L), monthly totals (559.4 kL), and estimated bills with rate transparency (₹8/kL residential tariff). No more billing disputes."
  },
  {
    feature: "Alerts & Advisories",
    detail: "Proactive notifications: 'Water supply active: 6:00 AM – 10:00 PM. Off-peak hours may have reduced pressure.' Know before your taps go dry."
  },
  {
    feature: "Pressure Trend Visibility",
    detail: "24-hour pressure trend charts with 84% stability scores. See how your neighborhood's water health changes throughout the day."
  },
  {
    feature: "Neighbourhood Health",
    detail: "Zone-level data showing the health of water supply in your area. Connected to real-time telemetry for community awareness."
  },
  {
    feature: "User Profile & Location",
    detail: "Personalized dashboard tied to your specific node and zone (e.g., Sector 2, Z13, Node n1). Your data, your area, your supply."
  },
]

/* ───────────────────────────────────────────
   DATA: BEFORE → AFTER TRANSFORMATION
   ─────────────────────────────────────────── */
const transformations = [
  { before: "Manual system, no automation", after: "AI-powered autonomous response", icon: "🔧 → 🤖" },
  { before: "6+ hour leak detection", after: "< 60 second crisis response", icon: "⏰ → ⚡" },
  { before: "Zero consumer visibility", after: "Real-time consumer dashboard", icon: "🔲 → 📊" },
  { before: "₹20,000 Cr annual NRW loss", after: "40% NRW reduction potential", icon: "💸 → 💰" },
  { before: "Paper-based record keeping", after: "Digital twin simulation", icon: "📄 → 🌐" },
  { before: "Reactive maintenance only", after: "Predictive anomaly prevention", icon: "🔨 → 🔮" },
]

/* ═══════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════ */
export function ImpactSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: "-50px" })

  return (
    <section ref={containerRef} className="relative py-20 overflow-hidden">
      {/* Cork board background for this section */}
      <div className="absolute inset-0 cork-board" />
      <div className="absolute inset-0 bg-[#c4956a]/20" />

      <div className="relative z-10 max-w-6xl mx-auto px-6">

        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <span className="classified-stamp mb-4 inline-block" style={{ borderColor: "#2d5a27", color: "#2d5a27" }}>
            SOLUTION DOSSIER
          </span>
          <h2 className="newspaper-headline text-4xl md:text-5xl lg:text-6xl mt-4 text-[#1a1a1a]">
            THE <span className="text-[#2d5a27]">HYDROMIND</span> ANSWER
          </h2>
          <div className="w-32 h-[3px] bg-[#2d5a27] mx-auto mt-4 mb-6" />
          <p className="typewriter text-lg text-[#5a5246] max-w-3xl mx-auto bg-[#faf6ee]/80 p-3 inline-block">
            How a single AI-powered platform transforms both operator capabilities 
            and consumer awareness — solving every problem documented above.
          </p>
        </motion.div>

        {/* ============================================
            SECTION A: THE OPERATOR'S COMMAND CENTER
            ============================================ */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.8 }}
          className="mb-20"
        >
          <div className="paper-card p-8 md:p-10" style={{ transform: "rotate(-0.3deg)" }}>
            {/* Sub-section header */}
            <div className="flex items-start gap-4 mb-8">
              <span className="classified-stamp text-xs whitespace-nowrap">EXHIBIT D</span>
              <div>
                <h3 className="newspaper-headline text-3xl md:text-4xl mb-2">
                  THE OPERATOR&apos;S <span className="text-[#2d5a27]">COMMAND CENTER</span>
                </h3>
                <p className="typewriter text-sm text-[#5a5246]">
                  From blind management to total situational awareness — the HydroMind Operator Dashboard.
                </p>
              </div>
            </div>

            {/* Screenshot - Operator Dashboard */}
            <div className="polaroid mb-8 mx-auto max-w-4xl" style={{ transform: "rotate(0.5deg)" }}>
              <img
                src="/operator-dashboard.png"
                alt="HydroMind Operator Dashboard — Command Center showing 785-node network, AI Agent, system status, and real-time telemetry"
                className="w-full h-auto"
              />
              <div className="polaroid-caption">
                EVIDENCE PHOTO: HydroMind Operator Command Center — Live at hydromind-inference-app.azurewebsites.net
              </div>
            </div>

            {/* Before → After capability cards */}
            <div className="space-y-4">
              {operatorCapabilities.map((cap, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex flex-col md:flex-row gap-4 items-start paper-card-aged p-4"
                  style={{ transform: `rotate(${(index % 3 - 1) * 0.3}deg)` }}
                >
                  {/* Before */}
                  <div className="md:w-1/3 flex items-start gap-2">
                    <span className="text-[#8b0000] font-bold text-lg">✗</span>
                    <div>
                      <span className="handwritten text-xs text-[#8b0000] tracking-wider block">BEFORE</span>
                      <span className="typewriter text-sm text-[#5a5246] line-through">{cap.before}</span>
                    </div>
                  </div>
                  {/* Arrow */}
                  <div className="hidden md:flex items-center text-[#2d5a27] text-xl font-bold">→</div>
                  {/* After */}
                  <div className="md:w-1/3 flex items-start gap-2">
                    <span className="text-[#2d5a27] font-bold text-lg">✓</span>
                    <div>
                      <span className="handwritten text-xs text-[#2d5a27] tracking-wider block">AFTER</span>
                      <span className="typewriter text-sm text-[#1a1a1a] font-bold">{cap.after}</span>
                    </div>
                  </div>
                  {/* Detail */}
                  <div className="md:w-1/3">
                    <span className="typewriter text-xs text-[#5a5246] leading-relaxed">{cap.detail}</span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-8 text-center">
              <a
                href="https://hydromind-inference-app.azurewebsites.net/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block paper-card px-8 py-4 handwritten text-lg text-[#2d5a27] hover:bg-[#f0e6d0] transition-colors border-2 border-[#2d5a27] font-bold tracking-wide"
              >
                🔗 OPEN OPERATOR DASHBOARD →
              </a>
            </div>
          </div>
        </motion.div>

        {/* ============================================
            SECTION B: THE CONSUMER'S DASHBOARD
            ============================================ */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.8 }}
          className="mb-20"
        >
          <div className="paper-card p-8 md:p-10" style={{ transform: "rotate(0.3deg)" }}>
            {/* Sub-section header */}
            <div className="flex items-start gap-4 mb-8">
              <span className="classified-stamp text-xs whitespace-nowrap">EXHIBIT E</span>
              <div>
                <h3 className="newspaper-headline text-3xl md:text-4xl mb-2">
                  THE CONSUMER&apos;S <span className="text-[#2d5a27]">DASHBOARD</span>
                </h3>
                <p className="typewriter text-sm text-[#5a5246]">
                  From total darkness to full transparency — every consumer gets real-time visibility into their water supply.
                </p>
              </div>
            </div>

            {/* Screenshot - Consumer Dashboard */}
            <div className="polaroid mb-8 mx-auto max-w-4xl" style={{ transform: "rotate(-0.5deg)" }}>
              <img
                src="/consumer-dashboard.png"
                alt="HydroMind Consumer Dashboard — showing pressure gauges, quality score, usage tracking, billing, and alerts"
                className="w-full h-auto"
              />
              <div className="polaroid-caption">
                EVIDENCE PHOTO: HydroMind Consumer View — Real-time water monitoring for every household
              </div>
            </div>

            {/* Consumer capability cards */}
            <div className="grid md:grid-cols-2 gap-5">
              {consumerCapabilities.map((cap, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="paper-card-aged p-5 border-l-4 border-l-[#2d5a27]"
                  style={{ transform: `rotate(${(index % 3 - 1) * 0.5}deg)` }}
                >
                  <h4 className="handwritten text-sm text-[#2d5a27] tracking-wider mb-2 font-bold">
                    ✓ {cap.feature}
                  </h4>
                  <p className="typewriter text-xs text-[#5a5246] leading-relaxed">
                    {cap.detail}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-8 text-center">
              <a
                href="https://hydromind-inference-app.azurewebsites.net/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block paper-card px-8 py-4 handwritten text-lg text-[#2d5a27] hover:bg-[#f0e6d0] transition-colors border-2 border-[#2d5a27] font-bold tracking-wide"
              >
                🔗 TRY CONSUMER DASHBOARD →
              </a>
            </div>
          </div>
        </motion.div>

        {/* ============================================
            SECTION C: THE TRANSFORMATION
            ============================================ */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.8 }}
        >
          <div className="text-center mb-10">
            <span className="classified-stamp mb-4 inline-block" style={{ borderColor: "#2d5a27", color: "#2d5a27" }}>EXHIBIT F</span>
            <h3 className="newspaper-headline text-3xl md:text-4xl mt-4 text-[#1a1a1a]">
              THE <span className="text-[#2d5a27]">TRANSFORMATION</span>
            </h3>
            <div className="w-24 h-[3px] bg-[#2d5a27] mx-auto mt-4 mb-6" />
          </div>

          {/* Before → After comparison board */}
          <div className="max-w-3xl mx-auto">
            {/* Red string SVG connecting items */}
            <div className="relative">
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" style={{ opacity: 0.3 }}>
                <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#cc2222" strokeWidth="2" strokeDasharray="6 6" />
              </svg>

              <div className="space-y-4 relative z-10">
                {transformations.map((t, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="flex items-stretch gap-4"
                  >
                    {/* Before card */}
                    <div className="flex-1 paper-card p-4 text-right border-r-4 border-r-[#8b0000]"
                      style={{ transform: `rotate(${-0.5 + (index % 3) * 0.3}deg)` }}
                    >
                      <span className="handwritten text-xs text-[#8b0000] tracking-wider block mb-1">BEFORE</span>
                      <span className="typewriter text-sm text-[#5a5246] line-through">{t.before}</span>
                    </div>

                    {/* Center icon */}
                    <div className="flex items-center justify-center w-16 shrink-0">
                      <div className="paper-card-aged w-12 h-12 flex items-center justify-center text-xl rounded-full border-2 border-[#c4b69c]">
                        {t.icon.split(" → ")[1]}
                      </div>
                    </div>

                    {/* After card */}
                    <div className="flex-1 paper-card p-4 border-l-4 border-l-[#2d5a27]"
                      style={{ transform: `rotate(${0.5 - (index % 3) * 0.3}deg)` }}
                    >
                      <span className="handwritten text-xs text-[#2d5a27] tracking-wider block mb-1">AFTER</span>
                      <span className="typewriter text-sm text-[#1a1a1a] font-bold">{t.after}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Final statement */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-16 max-w-3xl mx-auto text-center"
          >
            <div className="newspaper-clipping p-8 inline-block" style={{ transform: "rotate(-0.5deg)" }}>
              <h3 className="newspaper-headline text-2xl mb-4">THE VERDICT</h3>
              <div className="w-full h-[2px] bg-[#1a1a1a] mb-4" />
              <p className="typewriter text-sm text-[#5a5246] leading-relaxed max-w-xl mx-auto">
                HydroMind transforms India&apos;s water crisis from an invisible catastrophe into a 
                <span className="evidence-underline"> fully visible, AI-managed, autonomously responsive system</span>. 
                Operators gain a command center. Consumers gain transparency. 
                Cities gain resilience. And <span className="highlight-marker">billions of liters of water are saved</span>.
              </p>
              <div className="mt-6">
                <a
                  href="https://hydromind-inference-app.azurewebsites.net/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block paper-card px-8 py-4 handwritten text-lg text-[#8b0000] hover:bg-[#f0e6d0] transition-colors border-2 border-[#8b0000] font-bold tracking-wide"
                >
                  🔗 SEE THE LIVE SYSTEM →
                </a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
