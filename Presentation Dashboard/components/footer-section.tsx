"use client"

import { motion } from "framer-motion"

export function FooterSection() {
  return (
    <footer className="relative pt-16 pb-8 overflow-hidden bg-[#e8dcc8]">
      {/* Torn edge at top */}
      <div className="absolute top-0 left-0 right-0 h-5 bg-[#f5f0e8]"
        style={{
          clipPath: "polygon(0% 0%, 100% 0%, 100% 40%, 98% 100%, 95% 50%, 92% 90%, 89% 30%, 86% 80%, 83% 40%, 80% 100%, 77% 20%, 74% 70%, 71% 40%, 68% 90%, 65% 30%, 62% 80%, 59% 50%, 56% 100%, 53% 20%, 50% 60%, 47% 30%, 44% 80%, 41% 50%, 38% 100%, 35% 20%, 32% 70%, 29% 40%, 26% 90%, 23% 30%, 20% 80%, 17% 50%, 14% 100%, 11% 20%, 8% 60%, 5% 30%, 2% 70%, 0% 50%)"
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-6">
        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="newspaper-clipping p-8 md:p-12 text-center mb-12 mx-auto max-w-3xl"
          style={{ transform: "rotate(-0.3deg)" }}
        >
          <h2 className="newspaper-headline text-3xl md:text-4xl mb-4">
            CASE REMAINS <span className="text-[#2d5a27]">OPEN</span>
          </h2>
          <div className="w-full h-[2px] bg-[#1a1a1a] mb-4" />
          <p className="typewriter text-sm text-[#5a5246] leading-relaxed max-w-xl mx-auto mb-8">
            The investigation continues. The evidence is clear. The solution exists. 
            Explore the live system or join the open-source effort to solve 
            India&apos;s water infrastructure crisis.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://hydromind-inference-app.azurewebsites.net/"
              target="_blank"
              rel="noopener noreferrer"
              className="paper-card px-8 py-3 handwritten text-base text-[#8b0000] hover:bg-[#f0e6d0] transition-colors border-2 border-[#8b0000] font-bold tracking-wide"
            >
              📋 LIVE DASHBOARD
            </a>
            <a
              href="https://github.com/ar-yansingh/HydroMind_RL"
              target="_blank"
              rel="noopener noreferrer"
              className="paper-card-aged px-8 py-3 handwritten text-base text-[#5a5246] hover:bg-[#e8dcc8] transition-colors tracking-wide"
            >
              📁 GITHUB REPOSITORY
            </a>
          </div>
        </motion.div>

        {/* Footer content */}
        <div className="border-t border-[#c4b69c] pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="p-1.5 border-2 border-[#8b0000] bg-[#faf6ee]">
                <span className="text-[#8b0000] text-sm font-bold">HM</span>
              </div>
              <div>
                <span className="newspaper-headline text-lg">HydroMind</span>
                <p className="handwritten text-xs text-[#5a5246]">AI-Powered Water Crisis Response</p>
              </div>
            </div>

            {/* Links */}
            <div className="flex flex-wrap items-center justify-center gap-6">
              <a href="https://github.com/ar-yansingh/HydroMind_RL" target="_blank" rel="noopener noreferrer" className="handwritten text-sm text-[#5a5246] hover:text-[#8b0000] transition-colors">
                GitHub ↗
              </a>
              <a href="https://hydromind-inference-app.azurewebsites.net/" target="_blank" rel="noopener noreferrer" className="handwritten text-sm text-[#5a5246] hover:text-[#8b0000] transition-colors">
                Live Demo ↗
              </a>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-8 pt-6 border-t border-[#c4b69c] text-center">
            <p className="handwritten text-xs text-[#8b6d4e]">
              Case File: HydroMind — Open Source Investigation
            </p>
            <p className="typewriter text-[10px] text-[#8b6d4e]/60 mt-1">
              Built with purpose by engineers who care about water.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
