"use client"

import { motion } from "framer-motion"

interface NewsArticle {
  id: string
  title: string
  excerpt: string
  source: string
  date: string
  category: "crisis" | "technology" | "impact" | "discovery"
}

const newsArticles: NewsArticle[] = [
  {
    id: "1",
    title: "Digital water grid: Can tech help India solve its water crisis",
    excerpt: "A well-integrated digital water management grid can assist India in moving toward a future where water is managed more sustainably, reliably, and intelligently.",
    source: "YourStory",
    date: "March 2026",
    category: "technology",
  },
  {
    id: "2",
    title: "World Water Day 2026: What India's water crisis means for women",
    excerpt: "India has 4% of the world's freshwater to support over 1.4 billion people. Women walk between 5 and 20 kilometres daily to fetch water, carrying 15 litres each time.",
    source: "Firstpost",
    date: "March 2026",
    category: "crisis",
  },
  {
    id: "3",
    title: "India's Bengaluru fast running out of water – and it's not summer yet",
    excerpt: "Residents say they are facing the worst water crisis in decades as they witness an unusually hot February and March. The city's water supply systems are struggling.",
    source: "Al Jazeera",
    date: "March 2026",
    category: "crisis",
  },
  {
    id: "4",
    title: "Wading through the complexity of India's surface water resources",
    excerpt: "The effects of climate change on India's water resources are becoming increasingly evident. Surface water depletion and groundwater stress create urgent need for management.",
    source: "The Hindu",
    date: "Nov 2025",
    category: "discovery",
  },
  {
    id: "5",
    title: "AI and Real-time Monitoring Transform Urban Water Management",
    excerpt: "Smart sensors and machine learning algorithms enable cities to detect leaks within seconds. Autonomous systems reduce crisis response time from hours to minutes.",
    source: "Tech Daily",
    date: "Feb 2026",
    category: "technology",
  },
  {
    id: "6",
    title: "Graph Neural Networks Show 40% Improvement in Water Loss Prevention",
    excerpt: "Advanced AI models trained on network topology outperform traditional approaches. Predictive analytics help anticipate crises before they occur.",
    source: "AI Research Today",
    date: "Jan 2026",
    category: "technology",
  },
  {
    id: "7",
    title: "Climate Resilience: Cities Adopt Digital Twin Simulations",
    excerpt: "Physics-based digital twin technology combined with reinforcement learning enables crisis prevention. Network resilience increases dramatically.",
    source: "Infrastructure Weekly",
    date: "Dec 2025",
    category: "discovery",
  },
  {
    id: "8",
    title: "₹20,000 Crore Annual Loss: India's Water Infrastructure Crisis",
    excerpt: "Non-Revenue Water losses plague Indian cities as aging infrastructure fails to detect and prevent leaks. Digital transformation is critical.",
    source: "Economic Times",
    date: "Oct 2025",
    category: "impact",
  },
]

const categoryLabels: Record<string, { label: string; color: string }> = {
  crisis: { label: "CRISIS ALERT", color: "#8b0000" },
  technology: { label: "TECHNOLOGY", color: "#2d5a27" },
  impact: { label: "IMPACT", color: "#8b6d4e" },
  discovery: { label: "DISCOVERY", color: "#1a4f6e" },
}

const rotations = [-2.5, 1.8, -1, 3, -1.5, 2, -3, 1.2]

export function NewsSliderArticles() {
  return (
    <section className="relative py-20 overflow-hidden">
      {/* Parchment background */}
      <div className="absolute inset-0 bg-[#f5f0e8]" />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="classified-stamp mb-4 inline-block">EVIDENCE ARCHIVE</span>
          <h2 className="newspaper-headline text-4xl md:text-5xl mt-4">
            CLIPPINGS &amp; <span className="text-[#8b0000]">EVIDENCE</span>
          </h2>
          <div className="w-32 h-[3px] bg-[#8b0000] mx-auto mt-4 mb-6" />
          <p className="typewriter text-base text-[#5a5246] max-w-2xl mx-auto">
            Real news articles and research documenting the water crisis 
            and the emerging technology fighting it.
          </p>
        </motion.div>

        {/* Newspaper clipping grid — scattered layout */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {newsArticles.map((article, index) => {
            const category = categoryLabels[article.category]
            const rotation = rotations[index % rotations.length]

            return (
              <motion.article
                key={article.id}
                initial={{ opacity: 0, y: 20, rotate: rotation }}
                whileInView={{ opacity: 1, y: 0, rotate: rotation }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                whileHover={{ rotate: 0, scale: 1.03, zIndex: 10 }}
                className="newspaper-clipping p-5 cursor-pointer transition-shadow duration-300 hover:shadow-xl relative"
              >
                {/* Tape strip on top */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-5 bg-[rgba(255,235,180,0.85)] border border-[rgba(200,180,120,0.4)] z-10"
                  style={{ transform: `translateX(-50%) rotate(${rotation * -0.5}deg)` }}
                />

                {/* Category badge */}
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className="handwritten text-[10px] tracking-[0.15em] font-bold px-2 py-0.5 border"
                    style={{ color: category.color, borderColor: category.color }}
                  >
                    {category.label}
                  </span>
                  <span className="typewriter text-[10px] text-[#8b6d4e]">{article.date}</span>
                </div>

                {/* Title */}
                <h3 className="newspaper-headline text-sm leading-snug mb-3 text-[#1a1a1a]">
                  {article.title}
                </h3>

                {/* Divider */}
                <div className="w-full h-[1px] bg-[#c4b69c] mb-3" />

                {/* Excerpt */}
                <p className="typewriter text-[11px] text-[#5a5246] leading-relaxed line-clamp-4">
                  {article.excerpt}
                </p>

                {/* Source */}
                <div className="mt-3 flex items-center justify-between">
                  <span className="handwritten text-[10px] text-[#8b6d4e] italic">— {article.source}</span>
                  <span className="handwritten text-[10px] text-[#8b0000]">Read ↗</span>
                </div>
              </motion.article>
            )
          })}
        </div>

        {/* Article count */}
        <div className="text-center mt-10">
          <span className="handwritten text-sm text-[#5a5246]">
            {newsArticles.length} evidence clippings archived • Hover to examine
          </span>
        </div>
      </div>
    </section>
  )
}
