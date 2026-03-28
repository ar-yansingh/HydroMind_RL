"use client"

import { useEffect, useRef, useCallback } from "react"

interface Ripple {
  x: number
  y: number
  radius: number
  maxRadius: number
  opacity: number
  speed: number
  waveOffset: number
}

interface WaterParticle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
}

export function WaterRippleEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ripplesRef = useRef<Ripple[]>([])
  const particlesRef = useRef<WaterParticle[]>([])
  const mouseRef = useRef({ x: 0, y: 0, prevX: 0, prevY: 0 })
  const frameRef = useRef<number>(0)
  const lastRippleTimeRef = useRef(0)
  const timeRef = useRef(0)

  const createRipple = useCallback((x: number, y: number, isClick = false) => {
    const now = Date.now()
    // Throttle ripple creation for mouse movement
    if (!isClick && now - lastRippleTimeRef.current < 40) return
    lastRippleTimeRef.current = now

    const ripple: Ripple = {
      x,
      y,
      radius: 0,
      maxRadius: isClick ? 280 : 120,
      opacity: isClick ? 0.85 : 0.5,
      speed: isClick ? 5 : 3,
      waveOffset: Math.random() * Math.PI * 2,
    }
    ripplesRef.current.push(ripple)
    
    // Create water splash particles on click
    if (isClick) {
      for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.3
        const speed = 2 + Math.random() * 3
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          life: 1,
          maxLife: 40 + Math.random() * 20,
          size: 3 + Math.random() * 4,
        })
      }
    }
    
    // Limit number of ripples
    if (ripplesRef.current.length > 25) {
      ripplesRef.current.shift()
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.prevX = mouseRef.current.x
      mouseRef.current.prevY = mouseRef.current.y
      mouseRef.current.x = e.clientX
      mouseRef.current.y = e.clientY
      
      // Calculate movement speed
      const dx = mouseRef.current.x - mouseRef.current.prevX
      const dy = mouseRef.current.y - mouseRef.current.prevY
      const speed = Math.sqrt(dx * dx + dy * dy)
      
      // Create ripples more easily when moving
      if (speed > 2) {
        createRipple(e.clientX, e.clientY)
      }
    }

    const handleClick = (e: MouseEvent) => {
      createRipple(e.clientX, e.clientY, true)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("click", handleClick)

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      timeRef.current += 0.05

      // Draw ripples with water-flow wave effect
      ripplesRef.current = ripplesRef.current.filter((ripple) => {
        ripple.radius += ripple.speed
        ripple.opacity *= 0.97

        if (ripple.opacity < 0.01 || ripple.radius > ripple.maxRadius) {
          return false
        }

        // Draw multiple concentric rings with wave distortion for realistic water
        for (let i = 0; i < 5; i++) {
          const ringRadius = ripple.radius - i * 12
          if (ringRadius > 0) {
            const ringOpacity = ripple.opacity * (1 - i * 0.2)
            const waveAmplitude = 2 + ringRadius * 0.02
            
            // Draw wavy ring
            ctx.beginPath()
            for (let angle = 0; angle <= Math.PI * 2; angle += 0.05) {
              const wave = Math.sin(angle * 6 + ripple.waveOffset + timeRef.current * 2) * waveAmplitude
              const r = ringRadius + wave
              const px = ripple.x + Math.cos(angle) * r
              const py = ripple.y + Math.sin(angle) * r
              if (angle === 0) {
                ctx.moveTo(px, py)
              } else {
                ctx.lineTo(px, py)
              }
            }
            ctx.closePath()
            
            // Gradient stroke for depth effect
            const gradient = ctx.createRadialGradient(
              ripple.x, ripple.y, ringRadius * 0.5,
              ripple.x, ripple.y, ringRadius * 1.2
            )
            gradient.addColorStop(0, `rgba(14, 165, 233, ${ringOpacity * 0.3})`)
            gradient.addColorStop(0.5, `rgba(6, 182, 212, ${ringOpacity})`)
            gradient.addColorStop(1, `rgba(14, 165, 233, ${ringOpacity * 0.5})`)
            
            ctx.strokeStyle = gradient
            ctx.lineWidth = 3 - i * 0.4
            ctx.stroke()
            
            // Inner highlight for water sheen
            if (i === 0) {
              ctx.beginPath()
              for (let angle = 0; angle <= Math.PI * 2; angle += 0.05) {
                const wave = Math.sin(angle * 6 + ripple.waveOffset + timeRef.current * 2) * waveAmplitude * 0.5
                const r = ringRadius * 0.85 + wave
                const px = ripple.x + Math.cos(angle) * r
                const py = ripple.y + Math.sin(angle) * r
                if (angle === 0) {
                  ctx.moveTo(px, py)
                } else {
                  ctx.lineTo(px, py)
                }
              }
              ctx.closePath()
              ctx.strokeStyle = `rgba(255, 255, 255, ${ringOpacity * 0.4})`
              ctx.lineWidth = 1.5
              ctx.stroke()
            }
          }
        }

        return true
      })

      // Draw and update water particles
      particlesRef.current = particlesRef.current.filter((particle) => {
        particle.x += particle.vx
        particle.y += particle.vy
        particle.vy += 0.15 // gravity
        particle.life -= 1 / particle.maxLife
        
        if (particle.life <= 0) return false
        
        const alpha = particle.life * 0.8
        
        // Draw droplet with glow
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2)
        const dropGradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.size * particle.life
        )
        dropGradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.6})`)
        dropGradient.addColorStop(0.4, `rgba(14, 165, 233, ${alpha})`)
        dropGradient.addColorStop(1, `rgba(6, 182, 212, ${alpha * 0.3})`)
        ctx.fillStyle = dropGradient
        ctx.fill()
        
        return true
      })

      // Limit particles
      if (particlesRef.current.length > 100) {
        particlesRef.current = particlesRef.current.slice(-100)
      }

      // Draw mouse trail with flowing water glow
      const glowSize = 60
      const gradient = ctx.createRadialGradient(
        mouseRef.current.x,
        mouseRef.current.y,
        0,
        mouseRef.current.x,
        mouseRef.current.y,
        glowSize
      )
      gradient.addColorStop(0, "rgba(14, 165, 233, 0.25)")
      gradient.addColorStop(0.3, "rgba(6, 182, 212, 0.15)")
      gradient.addColorStop(0.6, "rgba(16, 185, 129, 0.08)")
      gradient.addColorStop(1, "rgba(14, 165, 233, 0)")
      
      ctx.beginPath()
      ctx.arc(mouseRef.current.x, mouseRef.current.y, glowSize, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()
      
      // Inner bright core
      const coreGradient = ctx.createRadialGradient(
        mouseRef.current.x,
        mouseRef.current.y,
        0,
        mouseRef.current.x,
        mouseRef.current.y,
        15
      )
      coreGradient.addColorStop(0, "rgba(255, 255, 255, 0.3)")
      coreGradient.addColorStop(0.5, "rgba(14, 165, 233, 0.2)")
      coreGradient.addColorStop(1, "rgba(14, 165, 233, 0)")
      
      ctx.beginPath()
      ctx.arc(mouseRef.current.x, mouseRef.current.y, 15, 0, Math.PI * 2)
      ctx.fillStyle = coreGradient
      ctx.fill()

      frameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("click", handleClick)
      cancelAnimationFrame(frameRef.current)
    }
  }, [createRipple])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{ mixBlendMode: "screen" }}
    />
  )
}
