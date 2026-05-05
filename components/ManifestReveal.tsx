'use client'

import { motion } from 'framer-motion'

export function ManifestReveal({ paragraphs }: { paragraphs: string[] }) {
  return (
    <article className="flex-1 max-w-2xl">
      {paragraphs.map((para, i) => (
        <motion.p
          key={i}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.9,
            delay: 0.1 + i * 0.11,
            ease: [0.22, 1, 0.36, 1],
          }}
          className={`font-serif italic text-spark leading-[1.55] mb-7 last:mb-0 ${
            i === 0
              ? 'text-[clamp(1.75rem,4vw,3rem)]'
              : 'text-[clamp(1.1rem,2.2vw,1.6rem)]'
          }`}
        >
          {para}
        </motion.p>
      ))}
    </article>
  )
}
