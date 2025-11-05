import { motion } from 'framer-motion'
export function Section({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <section className="max-w-6xl mx-auto px-6 py-14">
      <motion.h2 initial={{opacity:0, y:16}} whileInView={{opacity:1, y:0}} viewport={{ once: true }} transition={{duration:0.5}}
        className="text-3xl font-[Poppins] font-semibold text-mist">
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p initial={{opacity:0, y:16}} whileInView={{opacity:1, y:0}} viewport={{ once: true }} transition={{duration:0.6, delay:0.05}}
          className="mt-2 text-mist/80">
          {subtitle}
        </motion.p>
      )}
    </section>
  )
}
