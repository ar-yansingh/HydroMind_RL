"use client"

import { useEffect, ReactNode } from "react"

interface SmoothScrollProviderProps {
  children: ReactNode
}

export function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  useEffect(() => {
    // Enable native smooth scrolling behavior via CSS
    document.documentElement.style.scrollBehavior = "smooth"
    
    return () => {
      document.documentElement.style.scrollBehavior = "auto"
    }
  }, [])

  return <>{children}</>
}
