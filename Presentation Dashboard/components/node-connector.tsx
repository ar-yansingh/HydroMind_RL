"use client"

import { useEffect, useRef, useState, ReactNode } from "react"

interface NodeConnectorProps {
  children: ReactNode
  className?: string
}

interface CardPosition {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export function NodeConnector({ children, className = "" }: NodeConnectorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [cardPositions, setCardPositions] = useState<CardPosition[]>([])
  const animationRef = useRef<number>()

  useEffect(() => {
    const updatePositions = () => {
      if (!containerRef.current) return
      
      const cards = containerRef.current.querySelectorAll("[data-node-card]")
      const containerRect = containerRef.current.getBoundingClientRect()
      
      const positions: CardPosition[] = []
      cards.forEach((card) => {
        const rect = card.getBoundingClientRect()
        positions.push({
          id: card.getAttribute("data-node-card") || "",
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top + rect.height / 2,
          width: rect.width,
          height: rect.height,
        })
      })
      setCardPositions(positions)
    }

    updatePositions()
    window.addEventListener("resize", updatePositions)
    window.addEventListener("scroll", updatePositions)

    return () => {
      window.removeEventListener("resize", updatePositions)
      window.removeEventListener("scroll", updatePositions)
    }
  }, [children])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resize = () => {
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()

    let progress = 0

    const animate = () => {
      const rect = container.getBoundingClientRect()
      ctx.clearRect(0, 0, rect.width, rect.height)

      if (hoveredCard && cardPositions.length > 0) {
        const hoveredPosition = cardPositions.find(p => p.id === hoveredCard)
        if (hoveredPosition) {
          progress = Math.min(progress + 0.08, 1)

          cardPositions.forEach((pos) => {
            if (pos.id !== hoveredCard) {
              const distance = Math.sqrt(
                Math.pow(pos.x - hoveredPosition.x, 2) + 
                Math.pow(pos.y - hoveredPosition.y, 2)
              )

              // Only connect to nearby cards
              if (distance < 400) {
                const opacity = (1 - distance / 400) * 0.6 * progress

                // Draw connecting line
                ctx.beginPath()
                ctx.moveTo(hoveredPosition.x, hoveredPosition.y)
                
                // Curved line
                const midX = (hoveredPosition.x + pos.x) / 2
                const midY = (hoveredPosition.y + pos.y) / 2 - 30
                ctx.quadraticCurveTo(midX, midY, pos.x, pos.y)
                
                const gradient = ctx.createLinearGradient(
                  hoveredPosition.x, hoveredPosition.y,
                  pos.x, pos.y
                )
                gradient.addColorStop(0, `rgba(14, 165, 233, ${opacity})`)
                gradient.addColorStop(0.5, `rgba(16, 185, 129, ${opacity * 0.8})`)
                gradient.addColorStop(1, `rgba(14, 165, 233, ${opacity})`)
                
                ctx.strokeStyle = gradient
                ctx.lineWidth = 2
                ctx.stroke()

                // Draw glowing dots along the line
                const dotProgress = (Date.now() / 1000) % 1
                const dotX = hoveredPosition.x + (pos.x - hoveredPosition.x) * dotProgress
                const dotY = hoveredPosition.y + (pos.y - hoveredPosition.y) * dotProgress - 
                  Math.sin(dotProgress * Math.PI) * 30 * progress

                ctx.beginPath()
                ctx.arc(dotX, dotY, 3, 0, Math.PI * 2)
                ctx.fillStyle = `rgba(14, 165, 233, ${opacity})`
                ctx.fill()

                // Draw endpoint glow
                const endGlow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 20)
                endGlow.addColorStop(0, `rgba(14, 165, 233, ${opacity * 0.5})`)
                endGlow.addColorStop(1, "rgba(14, 165, 233, 0)")
                ctx.fillStyle = endGlow
                ctx.fillRect(pos.x - 20, pos.y - 20, 40, 40)
              }
            }
          })

          // Draw center node glow
          const centerGlow = ctx.createRadialGradient(
            hoveredPosition.x, hoveredPosition.y, 0,
            hoveredPosition.x, hoveredPosition.y, 40
          )
          centerGlow.addColorStop(0, `rgba(16, 185, 129, ${0.4 * progress})`)
          centerGlow.addColorStop(1, "rgba(16, 185, 129, 0)")
          ctx.fillStyle = centerGlow
          ctx.fillRect(
            hoveredPosition.x - 40, 
            hoveredPosition.y - 40, 
            80, 80
          )
        }
      } else {
        progress = Math.max(progress - 0.1, 0)
      }

      animationRef.current = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [hoveredCard, cardPositions])

  return (
    <div 
      ref={containerRef} 
      className="relative"
      onMouseLeave={() => setHoveredCard(null)}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-10"
      />
      <div 
        className={className}
        onMouseOver={(e) => {
          const card = (e.target as HTMLElement).closest("[data-node-card]")
          if (card) {
            setHoveredCard(card.getAttribute("data-node-card"))
          }
        }}
      >
        {children}
      </div>
    </div>
  )
}
