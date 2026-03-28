<![CDATA[# 🔍 HydroMind — Presentation Dashboard

> **An investigative-style web experience that presents India's ₹20,000 Crore water crisis and the AI-powered HydroMind solution.**

This dashboard serves as an interactive storytelling platform designed for presentations, investor demos, and public awareness. It uses a **detective investigation board** visual theme — complete with cork boards, newspaper clippings, polaroid photos, push pins, and red strings — to walk viewers through the problem, the evidence, and the solution.

---

## 🖥️ Live Demo

🔗 **Live System:** [hydromind-inference-app.azurewebsites.net](https://hydromind-inference-app.azurewebsites.net/)

---

## 📸 Sections Overview

| Section | Description |
|---|---|
| **🔎 Investigation (Hero)** | Newspaper-headline style intro — "THE INVISIBLE CRISIS" — with floating evidence cards showing key stats (50% water lost, ₹20,000 Cr loss, 126B L/day global waste, 600M+ Indians at risk) |
| **📋 Exhibit A: The Scale of the Crisis** | Animated counters, sourced statistics, and case files from Bengaluru, Delhi, and Chennai water crises |
| **⚠️ Exhibit B: The Operator's Nightmare** | Field-report styled cards revealing why water operators fail — blind infrastructure, 6+ hour leak detection, guesswork pressure management |
| **📷 Exhibit C: The Consumer's Blind Spot** | Polaroid-style snapshots showing consumer impact — zero visibility, no warnings, hospitals at risk, women bearing the water burden |
| **✅ Solution Dossier: The HydroMind Answer** | Before → After comparison showing HydroMind's AI-powered transformation for both operators (command center) and consumers (real-time dashboard) |
| **📰 Evidence Clippings** | Auto-scrolling news article slider with real water crisis headlines |
| **📌 Footer** | Project links and credits |

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (Turbopack) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **UI Library** | [React 19](https://react.dev/) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) |
| **Animations** | [Framer Motion](https://www.framer.com/motion/) |
| **Components** | [Radix UI](https://www.radix-ui.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Charts** | [Recharts](https://recharts.org/) |
| **Analytics** | [Vercel Analytics](https://vercel.com/analytics) |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- npm or pnpm

### Installation

```bash
# Navigate to the Presentation Dashboard directory
cd "Presentation Dashboard"

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app will be available at **http://localhost:3000**.

### Build for Production

```bash
npm run build
npm run start
```

---

## 📁 Project Structure

```
Presentation Dashboard/
├── app/
│   ├── globals.css         # Global styles, custom theme (cork board, newspaper, etc.)
│   ├── layout.tsx          # Root layout with metadata & SEO
│   └── page.tsx            # Main page composing all sections
├── components/
│   ├── hero-section.tsx          # Investigation board hero with animated stats
│   ├── problem-section.tsx       # Crisis stats, city cases, operator & consumer pain points
│   ├── impact-section.tsx        # HydroMind solution showcase (before → after)
│   ├── tech-stack-section.tsx    # Interactive tech stack grid with detail modals
│   ├── news-slider-articles.tsx  # Auto-scrolling news clippings
│   ├── navigation.tsx            # File-tab styled navigation bar
│   ├── footer-section.tsx        # Footer with links
│   ├── water-ripple-effect.tsx   # Canvas-based water ripple animation
│   ├── tilt-card.tsx             # Interactive 3D tilt card component
│   ├── node-connector.tsx        # SVG node connection visualizer
│   ├── enhanced-icon.tsx         # Animated icon wrapper
│   ├── smooth-scroll-provider.tsx
│   ├── theme-provider.tsx
│   └── ui/                       # shadcn/ui component primitives
├── public/                       # Static assets (images, screenshots)
├── styles/                       # Additional stylesheets
└── package.json
```

---

## 🎨 Design Philosophy

This dashboard uses a unique **"Detective Investigation Board"** aesthetic:

- 🪧 **Cork Board Backgrounds** — Warm, textured surfaces that feel tactile and investigative
- 📰 **Newspaper Clippings** — Headlines and statistics styled as torn newspaper articles
- 📌 **Push Pins & Red Strings** — SVG elements connecting evidence points like a crime board
- 📷 **Polaroid Photos** — Grayscale images with handwritten captions
- 🖊️ **Handwritten Annotations** — Notes-style typography for a personal, investigative feel
- 🔴 **Classified Stamps** — "EXHIBIT A", "ACTIVE INVESTIGATION" badges for dramatic emphasis
- ✨ **Framer Motion Animations** — Smooth scroll-triggered reveals, animated counters, and micro-interactions

---

## 📊 Key Data Points Presented

- **50%** of treated water lost in Indian networks (Central Water Commission)
- **₹20,000 Crore** annual economic loss from Non-Revenue Water (Ministry of Jal Shakti)
- **126 Billion Liters/day** wasted globally (World Bank)
- **600M+ Indians** facing water stress (NITI Aayog)
- Case studies from **Bengaluru**, **Delhi**, and **Chennai**

---

## 🤝 Related

- **[HydroMind Dashboard](../HydroMind%20Dashboard/)** — The main operational dashboard with real-time network monitoring, AI agent control, simulation mode, and consumer/operator views.

---

## 📄 License

Part of the **HydroMind** project — AI-Powered Smart Water Management System.
]]>
