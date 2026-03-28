"use client"

import { Navigation } from "@/components/navigation"
import { HeroSection } from "@/components/hero-section"
import { ProblemSection } from "@/components/problem-section"
import { ImpactSection } from "@/components/impact-section"
import { NewsSliderArticles } from "@/components/news-slider-articles"
import { FooterSection } from "@/components/footer-section"

export default function HydroMindPage() {
  return (
    <main className="relative min-h-screen bg-[#f5f0e8] overflow-hidden">

      {/* Navigation — File Tab Bar */}
      <Navigation />

      {/* Hero — Investigation Board Header */}
      <section id="investigation" className="relative">
        <HeroSection />
      </section>

      {/* Problems — Extended Deep Dive */}
      <section id="problems" className="relative">
        <ProblemSection />
      </section>

      {/* Impact — HydroMind Solution Showcase */}
      <section id="impact" className="relative">
        <ImpactSection />
      </section>

      {/* Evidence Clippings — News Articles */}
      <section id="evidence" className="relative">
        <NewsSliderArticles />
      </section>

      {/* Footer */}
      <FooterSection />
    </main>
  )
}
