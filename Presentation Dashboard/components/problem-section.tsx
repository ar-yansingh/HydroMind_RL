"use client"

import { useRef, useEffect, useState } from "react"
import { motion, useInView } from "framer-motion"

/* ───────────────────────────────────────────
   ANIMATED COUNTER (typewriter-style)
   ─────────────────────────────────────────── */
function AnimatedCounter({ end, duration = 2, suffix = "" }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  useEffect(() => {
    if (!isInView) return
    let startTime: number
    let animationFrame: number
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1)
      setCount(Math.floor(progress * end))
      if (progress < 1) animationFrame = requestAnimationFrame(animate)
    }
    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [isInView, end, duration])

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

/* ───────────────────────────────────────────
   DATA: CRISIS STATS
   ─────────────────────────────────────────── */
const crisisStats = [
  {
    value: 50,
    suffix: "%",
    headline: "WATER LOST IN TRANSIT",
    source: "Central Water Commission, India",
    excerpt: "Nearly half of all treated, pumped water in Indian urban networks is lost before it ever reaches a consumer's tap. This 'Non-Revenue Water' represents a catastrophic failure of infrastructure management.",
    rotation: -2,
    image: "/images/water-leak.jpg",
    imageAlt: "Water leaking from an aged rusty faucet",
  },
  {
    value: 20000,
    suffix: " Cr",
    headline: "ANNUAL ECONOMIC LOSS",
    source: "Ministry of Jal Shakti, 2025",
    excerpt: "India loses an estimated ₹20,000 crore every year to Non-Revenue Water — treated water that is paid for but never generates revenue. This is money drained into aging, unmonitored underground pipes.",
    rotation: 1.5,
    image: "/images/pressure-gauge.jpg",
    imageAlt: "Industrial water pressure gauges on aging infrastructure",
  },
  {
    value: 126,
    suffix: "B L/day",
    headline: "GLOBAL WATER WASTE",
    source: "World Bank Global Water Report",
    excerpt: "Globally, 126 billion liters of treated water are wasted daily through distribution system losses. Enough to fill over 50,000 Olympic swimming pools — every single day.",
    rotation: -1,
    image: "/images/flood-street.jpg",
    imageAlt: "Urban street flooding from broken water pipe infrastructure",
  },
  {
    value: 600,
    suffix: "M",
    headline: "INDIANS FACE WATER STRESS",
    source: "NITI Aayog Composite Water Index",
    excerpt: "Over 600 million Indians face high to extreme water stress. 21 major Indian cities are projected to run out of groundwater by 2030, affecting 100 million people.",
    rotation: 2.5,
    image: "/images/drought-earth.jpg",
    imageAlt: "Cracked dry earth showing severe drought conditions",
  },
]

const caseCities = [
  {
    city: "Bengaluru",
    headline: "SILICON VALLEY OF INDIA RUNS DRY",
    detail: "In 2024-2026, Bengaluru faced its worst water crisis in decades. Borewells dried up, tanker mafia prices surged 300%, and residents queued for hours. The city's water supply infrastructure couldn't track where losses occurred.",
    source: "Al Jazeera, March 2026",
  },
  {
    city: "Delhi",
    headline: "CAPITAL CITY, CAPITAL CRISIS",
    detail: "Delhi's water distribution loses an estimated 40% of supply through leakage and theft. The Delhi Jal Board operates largely on manual systems, with over 1000km of pipelines unmapped digitally.",
    source: "Economic Times, 2025",
  },
  {
    city: "Chennai",
    headline: "DAY ZERO REVISITED",
    detail: "Chennai's 2019 'Day Zero' crisis saw all four major reservoirs dry up completely. Hotels shut, IT companies asked employees to work from home. Without real-time monitoring, the crisis was detected far too late.",
    source: "BBC India, 2024",
  },
]

/* ───────────────────────────────────────────
   DATA: OPERATOR PROBLEMS
   ─────────────────────────────────────────── */
const operatorProblems = [
  {
    title: "Blind Infrastructure",
    note: "Most Indian water networks have ZERO real-time pressure or flow sensors. Operators manage 1000+ km of pipes using paper records and periodic manual readings.",
  },
  {
    title: "6+ Hour Leak Detection",
    note: "When a pipe ruptures, especially at night, it takes an average of 6+ hours to detect. Discovery relies on citizen complaints — by then millions of liters are already lost.",
  },
  {
    title: "Phone-Based Coordination",
    note: "During emergencies, operators coordinate across departments via phone calls and messages. There is no centralized command center, no shared real-time view of the network.",
  },
  {
    title: "No Priority Routing",
    note: "When supply drops, operators cannot identify which areas contain hospitals, schools, or fire stations. Critical infrastructure loses supply alongside residential areas.",
  },
  {
    title: "Guesswork Pressure Management",
    note: "Without sensors, operators estimate pressure by 'experience'. Over-pressuring causes burst pipes; under-pressuring causes contamination from ingress.",
  },
  {
    title: "Aging Infrastructure, No Data",
    note: "Many pipes are 30-50 years old. Without digital records of pipe material, age, or maintenance history, preventive maintenance is impossible. Repairs are always reactive.",
  },
]

/* ───────────────────────────────────────────
   DATA: CONSUMER PROBLEMS
   ─────────────────────────────────────────── */
const consumerProblems = [
  {
    caption: "ZERO VISIBILITY",
    text: "Citizens have absolutely no way to check their water pressure, quality, or supply schedule in real-time. They discover problems only when taps go dry.",
    image: "/images/water-drip.jpg",
    imageAlt: "Water droplet falling from a tap — representing wasted supply",
  },
  {
    caption: "NO EARLY WARNINGS",
    text: "When a pipe burst occurs 2km away, residents have no warning that their area will lose supply. They find out when they're mid-shower or cooking dinner.",
    image: "/images/water-leak.jpg",
    imageAlt: "Water leaking from aged infrastructure pipe",
  },
  {
    caption: "CONTAMINATION BLIND SPOT",
    text: "Low pressure events cause groundwater infiltration into pipes, contaminating supply. Without quality monitoring, families consume contaminated water unknowingly.",
    image: "/images/water-pipe.jpg",
    imageAlt: "Old industrial water pipe infrastructure",
  },
  {
    caption: "BILLING DISPUTES",
    text: "Without usage tracking or metering data accessible to consumers, water bills feel arbitrary. There's no transparency in how charges are calculated.",
    image: "/images/pressure-gauge.jpg",
    imageAlt: "Industrial water meters and pressure gauges",
  },
  {
    caption: "HOSPITALS AT RISK",
    text: "When supply drops, hospitals requiring water for surgeries, dialysis, and sanitation lose access alongside everyone else. There is no priority supply mechanism.",
    image: "/images/flood-street.jpg",
    imageAlt: "Urban flooding from pipe burst aftermath",
  },
  {
    caption: "WOMEN BEAR THE BURDEN",
    text: "In areas with unreliable supply, women walk 5-20 km daily carrying 15L of water. This structural inequality is invisible in any operator dashboard because none exists.",
    image: "/images/drought-earth.jpg",
    imageAlt: "Cracked dry earth showing drought and water scarcity",
  },
]

/* ═══════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════ */
export function ProblemSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: "-50px" })

  return (
    <section ref={containerRef} className="relative py-20 overflow-hidden">
      {/* Parchment background */}
      <div className="absolute inset-0 bg-[#f5f0e8]" />
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='400' height='400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`
      }} />

      <div className="relative z-10 max-w-6xl mx-auto px-6">

        {/* ============================================
            SECTION A: THE SCALE OF THE CRISIS
            ============================================ */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="mb-20"
        >
          {/* Section header */}
          <div className="text-center mb-12">
            <span className="classified-stamp mb-4 inline-block">EXHIBIT A</span>
            <h2 className="newspaper-headline text-4xl md:text-5xl lg:text-6xl mt-4">
              THE SCALE OF THE <span className="text-[#8b0000]">CRISIS</span>
            </h2>
            <div className="w-32 h-[3px] bg-[#8b0000] mx-auto mt-4 mb-6" />
            <p className="typewriter text-lg text-[#5a5246] max-w-3xl mx-auto">
              The evidence is overwhelming. India&apos;s water infrastructure is hemorrhaging — 
              and the losses are measured in billions of liters and thousands of crores.
            </p>
          </div>

          {/* Crisis stat newspaper clippings WITH LOCAL IMAGES */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {crisisStats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                className="newspaper-clipping p-0 overflow-hidden tape"
                style={{ transform: `rotate(${stat.rotation}deg)` }}
              >
                {/* Image strip */}
                <div className="w-full h-44 overflow-hidden relative">
                  <img
                    src={stat.image}
                    alt={stat.imageAlt}
                    className="w-full h-full object-cover grayscale contrast-125 opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#fffff5]" />
                  {/* Stat overlay */}
                  <div className="absolute bottom-2 left-4">
                    <span className="newspaper-headline text-4xl md:text-5xl text-[#8b0000] drop-shadow-[0_2px_4px_rgba(255,255,245,0.9)]">
                      <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                    </span>
                  </div>
                </div>

                {/* Text content */}
                <div className="p-5">
                  <h3 className="newspaper-headline text-lg tracking-wide mb-2 border-b-2 border-[#1a1a1a] pb-2 inline-block">
                    {stat.headline}
                  </h3>
                  <p className="typewriter text-sm text-[#5a5246] leading-relaxed mt-3">
                    {stat.excerpt}
                  </p>
                  <div className="mt-3 text-xs handwritten text-[#8b6d4e] italic">
                    — {stat.source}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Case studies — city crises */}
          <div className="mb-8">
            <h3 className="handwritten text-2xl text-[#8b0000] mb-6 text-center">
              ▸ CASE FILES: Cities That Ran Dry
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              {caseCities.map((city, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.8 + index * 0.15 }}
                  className="paper-card-aged p-5 push-pin"
                  style={{ transform: `rotate(${index === 1 ? 1 : index === 0 ? -1.5 : 2}deg)` }}
                >
                  <div className="text-xs handwritten text-[#8b0000] tracking-[0.15em] mb-2">📍 {city.city.toUpperCase()}</div>
                  <h4 className="newspaper-headline text-base mb-3 leading-snug">{city.headline}</h4>
                  <p className="typewriter text-xs text-[#5a5246] leading-relaxed">{city.detail}</p>
                  <div className="mt-3 text-[10px] handwritten text-[#8b6d4e] italic">Source: {city.source}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Torn paper divider */}
        <div className="section-divider my-4" />

        {/* ============================================
            SECTION B: THE OPERATOR'S NIGHTMARE
            ============================================ */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.8 }}
          className="py-20"
        >
          <div className="text-center mb-12">
            <span className="classified-stamp mb-4 inline-block">EXHIBIT B</span>
            <h2 className="newspaper-headline text-4xl md:text-5xl mt-4">
              THE OPERATOR&apos;S <span className="text-[#8b0000]">NIGHTMARE</span>
            </h2>
            <div className="w-32 h-[3px] bg-[#8b0000] mx-auto mt-4 mb-6" />
            <p className="typewriter text-lg text-[#5a5246] max-w-3xl mx-auto">
              Water operators across India manage vast networks with tools from the last century. 
              Here is what a day looks like for someone trying to keep a city&apos;s water flowing — manually.
            </p>
          </div>

          {/* Key evidence photo — old gauges */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl mx-auto mb-10"
          >
            <div className="polaroid" style={{ transform: "rotate(-1deg)" }}>
              <img
                src="/images/pressure-gauge.jpg"
                alt="Old industrial water pressure gauges — the manual tools operators rely on"
                className="w-full h-auto grayscale contrast-110 opacity-90"
              />
              <div className="polaroid-caption">
                EXHIBIT B-1: The tools India&apos;s water operators rely on — analog gauges, no digital monitoring
              </div>
            </div>
          </motion.div>

          {/* Handwritten field notes layout */}
          <div className="max-w-4xl mx-auto">
            {/* Header - like a case file header */}
            <div className="paper-card p-4 mb-6 border-l-4 border-l-[#8b0000]" style={{ transform: "rotate(-0.3deg)" }}>
              <div className="handwritten text-sm text-[#8b0000] tracking-wider">FIELD REPORT — WATER NETWORK OPERATOR, TIER-II CITY</div>
              <div className="typewriter text-xs text-[#5a5246] mt-1">&quot;We are managing a 21st-century challenge with 20th-century tools.&quot;</div>
            </div>

            {/* Operator problems — styled as lined paper notes */}
            <div className="grid md:grid-cols-2 gap-5">
              {operatorProblems.map((problem, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="paper-card p-5 relative"
                  style={{
                    transform: `rotate(${(index % 3 - 1) * 0.8}deg)`,
                    backgroundImage: "repeating-linear-gradient(transparent, transparent 27px, #e8dcc8 28px)",
                    backgroundSize: "100% 28px",
                  }}
                >
                  {/* Red margin line */}
                  <div className="absolute top-0 bottom-0 left-10 w-[1px] bg-[#c41e3a]/30" />
                  
                  <div className="pl-8">
                    <h4 className="handwritten text-base font-bold text-[#8b0000] mb-2">
                      ✗ {problem.title}
                    </h4>
                    <p className="handwritten text-sm text-[#5a5246] leading-[28px]">
                      {problem.note}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Torn paper divider */}
        <div className="section-divider my-4" />

        {/* ============================================
            SECTION C: THE CONSUMER'S BLIND SPOT
            ============================================ */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.8 }}
          className="py-20"
        >
          <div className="text-center mb-12">
            <span className="classified-stamp mb-4 inline-block">EXHIBIT C</span>
            <h2 className="newspaper-headline text-4xl md:text-5xl mt-4">
              THE CONSUMER&apos;S <span className="text-[#8b0000]">BLIND SPOT</span>
            </h2>
            <div className="w-32 h-[3px] bg-[#8b0000] mx-auto mt-4 mb-6" />
            <p className="typewriter text-lg text-[#5a5246] max-w-3xl mx-auto">
              While operators struggle in the dark, consumers are completely blind. 
              No data. No warnings. No visibility. Just dry taps and contaminated water.
            </p>
          </div>

          {/* Polaroid-style snapshots WITH LOCAL IMAGES */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {consumerProblems.map((problem, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9, rotate: ((index % 3) - 1) * 3 }}
                whileInView={{ opacity: 1, scale: 1, rotate: ((index % 3) - 1) * 2 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="polaroid"
              >
                {/* Photo area — real image */}
                <div className="aspect-[4/3] overflow-hidden relative bg-[#e8dcc8]">
                  <img
                    src={problem.image}
                    alt={problem.imageAlt}
                    className="w-full h-full object-cover grayscale contrast-110 opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white/30 to-transparent" />
                </div>
                {/* Caption */}
                <div className="polaroid-caption mt-2 text-left px-1">
                  <span className="handwritten text-xs text-[#8b0000] tracking-wider block mb-1">⚠ {problem.caption}</span>
                  <span className="handwritten text-xs text-[#5a5246] leading-relaxed block">{problem.text}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Bottom call-out — highlighted evidence */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-16 max-w-3xl mx-auto"
          >
            <div className="paper-card-aged p-8 border-l-4 border-l-[#8b0000]" style={{ transform: "rotate(0.3deg)" }}>
              <h3 className="newspaper-headline text-xl mb-3">THE REALITY CHECK</h3>
              <p className="typewriter text-sm text-[#5a5246] leading-relaxed">
                When a pipe ruptures at <span className="highlight-marker font-bold">2 AM</span>, the current system relies on a citizen complaint, 
                a manual inspection crew, and hours of coordination. By then, entire neighborhoods have lost water pressure — 
                and <span className="evidence-underline font-bold">hospitals, schools, and fire hydrants go dry</span>. 
                Meanwhile, the consumer has <span className="highlight-marker">zero visibility</span> into what happened, 
                when it will be fixed, or whether their water is even safe to drink.
              </p>
            </div>
          </motion.div>
        </motion.div>

      </div>
    </section>
  )
}
