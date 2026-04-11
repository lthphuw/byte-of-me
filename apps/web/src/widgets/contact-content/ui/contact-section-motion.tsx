'use client';

import { motion } from 'framer-motion';

export function ContactSectionMotion({
  id,
  children,
  delay = 0,
}: {
  id?: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
    >
      {children}
    </motion.div>
  );
}
