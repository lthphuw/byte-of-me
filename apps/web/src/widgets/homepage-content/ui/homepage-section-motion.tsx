'use client';

import { motion } from 'framer-motion';

export interface HomepageSectionMotionProps {
  children: React.ReactNode;
  delay?: number;
  viewportOnce?: boolean;
}

export function HomepageSectionMotion({
  children,
  delay = 0,
  viewportOnce = true,
}: HomepageSectionMotionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: viewportOnce, margin: '-100px' }}
      transition={{
        duration: 0.8,
        delay: delay,
        ease: [0.21, 0.47, 0.32, 0.98], // Custom sleek cubic-bezier
      }}
    >
      {children}
    </motion.div>
  );
}
