import { motion } from 'framer-motion'
import { Logo } from './components/Logo'
import { Section } from './components/Section'
import { CTAForm } from './components/CTAForm'

const API_BASE = import.meta.env.VITE_API_BASE || ''

export default function App() {
  return (
    <div className="min-h-screen w-full bg-dark bg-dark-zen">
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <Logo small />
        <nav className="hidden sm:flex gap-6 text-sm text-mist/80">
          <a href="#solution" className="hover:text-mist">Solution</a>
          <a href="#engine" className="hover:text-mist">Empathic Engine</a>
          <a href="#join" className="hover:text-mist">Join Beta</a>
        </nav>
      </header>

      <main>
        <section className="max-w-6xl mx-auto px-6 pt-8 pb-20 md:pb-20 lg:pb-24 min-h-[80vh] grid md:grid-cols-2 gap-10 items-center">
          <div>
            <motion.h1 initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{duration:0.6}}
              className="text-4xl md:text-5xl font-bold font-[Poppins] text-mist">
              AI for Emotional Intelligence
            </motion.h1>
            <motion.p initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{duration:0.7, delay:0.05}}
              className="mt-4 text-mist/85">
              The AI that helps you feel better every day.
            </motion.p>
            <div className="mt-8">
              <CTAForm apiBase={API_BASE} />
            </div>
            <p className="mt-3 text-xs text-mist/60">By joining, you agree to be contacted for beta access. No spam.</p>
          </div>
          <motion.div initial={{opacity:0, scale:0.98}} animate={{opacity:1, scale:1}} transition={{duration:0.6}} className="relative">
            <img src="/images/cover_glow.webp" alt="MyndSelf Dark Zen glow"
              className="w-full rounded-3xl shadow-glow ring-1 ring-white/5 brightness-110" loading="eager"/>
            <div className="absolute -top-3 -right-3 text-xs bg-white/10 px-3 py-1 rounded-full border border-white/10">
              Confidential — MyndSelf.ai 2025
            </div>
          </motion.div>
        </section>

        <Section title="The Problem" subtitle="Digital stress, burnout, and emotional fatigue are rising." />

        <section id="solution" className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-3xl font-[Poppins] font-semibold text-mist">An empathic AI companion</h2>
            <ul className="mt-4 space-y-2 text-mist/85">
              <li>• Conversational empathy that listens to your state.</li>
              <li>• Mindful micro-routines tailored to your day.</li>
              <li>• Gentle insights to help you grow emotional awareness.</li>
            </ul>
          </div>
          <div>
            <img src="/images/chatbot_mockup.webp" 
                 alt="MyndSelf AI minimal chat mockup"
                 className="w-full rounded-3xl ring-1 ring-white/5 shadow-2xl brightness-110"
                 loading="lazy"
            />
          </div>
        </section>

        <section id="engine" className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-3xl font-[Poppins] font-semibold text-mist">The Empathic Engine</h2>
            <p className="mt-4 text-mist/85">Understands your tone. Adapts to your mood. Grows with you.</p>
            <p className="mt-2 text-mist/70">A context-aware AI layer that blends mindful coaching with conversational intelligence.</p>
          </div>
          <div>
            <img src="/images/empathic_engine.webp"
                 alt="Empathic Engine neural glow"
                 className="w-full rounded-3xl ring-1 ring-white/5 shadow-2xl brightness-110" 
                loading="lazy"
            />

          </div>
        </section>

        <section id="join" className="max-w-6xl mx-auto px-6 py-20">
          <div className="bg-white/5 ring-1 ring-white/10 rounded-3xl p-8 md:p-10 grid md:grid-cols-3 gap-8 items-center">
            <div className="md:col-span-2">
              <h3 className="text-2xl font-[Poppins] font-semibold text-mist">Join the Beta</h3>
              <p className="mt-2 text-mist/80">Get early access and help us shape an AI that truly cares.</p>
            </div>
            <CTAForm apiBase={API_BASE} compact />
          </div>
        </section>
      </main>

      <footer className="max-w-6xl mx-auto px-6 pb-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-mist/70 text-center md:text-left">
        <Logo tiny />
        <div className="opacity-80">hello@myndself.ai</div>
        <div className="opacity-60">© 2025 MyndSelf.ai — Confidential</div>
      </footer>
    </div>
  )
}
