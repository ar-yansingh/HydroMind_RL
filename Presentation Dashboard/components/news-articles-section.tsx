"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { Newspaper, TrendingUp, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EnhancedIcon } from "@/components/enhanced-icon"

interface NewsArticle {
  id: string
  title: string
  excerpt: string
  source: string
  date: string
  imageUrl?: string
  link?: string
  category: "discovery" | "crisis" | "technology" | "impact"
}

const newsArticles: NewsArticle[] = [
  {
    id: "1",
    title: "AI Revolution in Water Management: HydroMind Shows Promise",
    excerpt: "New AI system demonstrates real-time water crisis response with 94% accuracy in pilot cities",
    source: "TechNews Daily",
    date: "March 2024",
    category: "technology",
    link: "#"
  },
  {
    id: "2",
    title: "₹20,000 Crore Annual Loss: India's Hidden Water Crisis",
    excerpt: "Non-Revenue Water losses plague Indian cities as infrastructure ages without modern monitoring",
    source: "Environmental Times",
    date: "February 2024",
    category: "crisis",
    link: "#"
  },
  {
    id: "3",
    title: "Graph Neural Networks Transform Water Network Management",
    excerpt: "Breakthrough in autonomous crisis response shows 40% reduction in water loss probability",
    source: "AI Research Journal",
    date: "January 2024",
    category: "technology",
    link: "#"
  },
  {
    id: "4",
    title: "Climate-Smart Water Infrastructure: Cities Lead Digital Transformation",
    excerpt: "Real-time monitoring systems prove critical for achieving water security goals",
    source: "Sustainability Focus",
    date: "December 2023",
    category: "impact",
    link: "#"
  },
  {
    id: "5",
    title: "Water Crisis Threatens Urban Development Across South Asia",
    excerpt: "Experts warn of critical infrastructure failure without rapid intervention",
    source: "Global Water News",
    date: "November 2023",
    category: "crisis",
    link: "#"
  },
  {
    id: "6",
    title: "Digital Twin Technology Revolutionizes Water System Resilience",
    excerpt: "Physics-based simulation combined with AI enables unprecedented crisis prevention",
    source: "Infrastructure Tech",
    date: "October 2023",
    category: "discovery",
    link: "#"
  },
]

const categoryColors = {
  discovery: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", badge: "bg-blue-500/20" },
  crisis: { bg: "bg-rose-500/10", border: "border-rose-500/20", text: "text-rose-400", badge: "bg-rose-500/20" },
  technology: { bg: "bg-cyan-500/10", border: "border-cyan-500/20", text: "text-cyan-400", badge: "bg-cyan-500/20" },
  impact: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", badge: "bg-emerald-500/20" },
}

const categoryLabels = {
  discovery: "Discovery",
  crisis: "Crisis Alert",
  technology: "Technology",
  impact: "Impact",
}

export function NewsArticlesSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: "-100px" })

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  }

  return (
    <section ref={containerRef} className="relative py-32 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6">
            <Newspaper className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-blue-400 font-medium">In The News</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-balance">
            The <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Water Crisis</span> in Headlines<br />
            <span className="text-xl md:text-2xl text-muted-foreground font-normal mt-4 block">Latest coverage on global water management transformation</span>
          </h2>
        </motion.div>

        {/* Articles grid */}
        <motion.div
          variants={container}
          initial="hidden"
          animate={isInView ? "show" : "hidden"}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {newsArticles.map((article) => {
            const colors = categoryColors[article.category]
            
            return (
              <motion.div
                key={article.id}
                variants={item}
                className="group h-full"
              >
                <motion.div
                  whileHover={{ y: -8, boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}
                  className={`relative h-full p-6 rounded-2xl ${colors.bg} border ${colors.border} backdrop-blur-sm overflow-hidden transition-all duration-300 flex flex-col`}
                >
                  {/* Animated background effect */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-blue-400/20 to-transparent rounded-full blur-3xl -z-10 group-hover:scale-150 transition-transform duration-500"
                  />

                  {/* Category badge */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="mb-4"
                  >
                    <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${colors.badge} ${colors.text}`}>
                      {categoryLabels[article.category]}
                    </span>
                  </motion.div>

                  {/* Title */}
                  <motion.h3
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.15 }}
                    className="text-lg font-bold text-foreground mb-3 group-hover:text-blue-400 transition-colors duration-300 line-clamp-2"
                  >
                    {article.title}
                  </motion.h3>

                  {/* Excerpt */}
                  <motion.p
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                    className="text-sm text-muted-foreground mb-4 flex-1 line-clamp-3"
                  >
                    {article.excerpt}
                  </motion.p>

                  {/* Source and date */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.25 }}
                    className="flex items-center justify-between text-xs text-muted-foreground mb-4 pb-4 border-b border-white/5"
                  >
                    <span className="font-medium">{article.source}</span>
                    <span>{article.date}</span>
                  </motion.div>

                  {/* Read more button */}
                  <motion.button
                    whileHover={{ gap: "6px" }}
                    className={`inline-flex items-center gap-2 text-sm font-semibold ${colors.text} hover:opacity-100 opacity-70 transition-all duration-300`}
                  >
                    <span>Read full story</span>
                    <ExternalLink className="h-4 w-4" />
                  </motion.button>

                  {/* Hover indicator line */}
                  <motion.div
                    initial={{ scaleX: 0 }}
                    whileHover={{ scaleX: 1 }}
                    transition={{ duration: 0.3 }}
                    className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${categoryColors[article.category].border}`}
                    style={{ originX: 0 }}
                  />
                </motion.div>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Call to action */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-center mt-16"
        >
          <Button
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0"
          >
            <TrendingUp className="h-5 w-5 mr-2" />
            Read More Articles
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
