"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Search } from "lucide-react"

const navLinks = [
  { label: "Investigation", href: "#investigation" },
  { label: "Problems", href: "#problems" },
  { label: "Impact", href: "#impact" },
  { label: "Evidence", href: "#evidence" },
]

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState("#investigation")

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-[#f5f0e8]/95 backdrop-blur-sm border-b-2 border-[#c4b69c] shadow-md"
          : "bg-transparent"
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Case File Logo */}
          <a href="#" className="flex items-center gap-3 group">
            <div className="p-1.5 border-2 border-[#8b0000] bg-[#faf6ee]">
              <Search className="h-4 w-4 text-[#8b0000]" />
            </div>
            <span className="newspaper-headline text-xl">
              <span className="text-[#8b0000]">HYDRO</span>
              <span className="text-[#1a1a1a]">MIND</span>
            </span>
          </a>

          {/* File Tab Navigation */}
          <div className="hidden md:flex items-center gap-0">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setActiveSection(link.href)}
                className={`px-5 py-2 text-sm handwritten tracking-wide border border-[#c4b69c] border-b-0 transition-all duration-200 -mb-[2px] relative ${
                  activeSection === link.href
                    ? "bg-[#faf6ee] text-[#8b0000] font-bold border-b-2 border-b-[#faf6ee] z-10"
                    : "bg-[#e8dcc8] text-[#5a5246] hover:bg-[#f0e6d0] hover:text-[#1a1a1a]"
                }`}
                style={{
                  clipPath: "polygon(8% 0%, 92% 0%, 100% 100%, 0% 100%)"
                }}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Case Number */}
          <div className="hidden lg:flex items-center gap-3">
            <span className="classified-stamp text-xs">CASE FILE #HM-2026</span>
          </div>
        </div>
      </nav>
    </motion.header>
  )
}
