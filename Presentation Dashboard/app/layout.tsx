import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HydroMind — Investigation: India\'s ₹20,000 Crore Water Crisis',
  description: 'An investigative analysis into India\'s catastrophic water infrastructure failures, the ₹20,000 Crore annual losses from Non-Revenue Water, and how AI-powered crisis response can transform urban water management.',
  generator: 'HydroMind',
  keywords: ['water crisis', 'India water loss', 'NRW', 'AI water management', 'digital twin', 'urban infrastructure', 'water operators'],
}

export const viewport: Viewport = {
  themeColor: '#f5f0e8',
  colorScheme: 'light',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="font-sans antialiased bg-[#f5f0e8] text-[#1a1a1a]">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
