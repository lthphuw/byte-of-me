'use client';

import { useState } from 'react';
import { FloatingPortal } from '@floating-ui/react';
import { AnimatePresence, motion } from 'framer-motion';

import { Icons } from '@/components/icons';

interface FeatureCalloutProps {
  title: string;
  description?: React.ReactNode;
}

export default function FeatureCallout({
  title,
  description,
}: FeatureCalloutProps) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <FloatingPortal>
      <AnimatePresence>
        <motion.div
          className="fixed top-28 left-0 w-full z-50 flex justify-center"
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
        >
          <div className="relative w-[calc(100%-48px*2)] max-w-3xl md:w-full container-bg border shadow-xl dark:shadow-[0_4px_10px_rgba(255,255,255,0.05)] rounded-2xl p-6">
            {/* Close Button */}
            <button
              onClick={() => setVisible(false)}
              className="absolute top-3 right-3 text-xl text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <Icons.close />
            </button>

            {/* Content */}
            <div className="flex flex-col gap-3">
              <motion.h3
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="flex gap-2 pr-10"
              >
                <motion.span
                  className="inline-flex items-center justify-center text-primary"
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0],
                    filter: [
                      'drop-shadow(0 0 0px rgba(255,255,255,0))',
                      'drop-shadow(0 0 4px rgba(255,255,255,0.6))',
                      'drop-shadow(0 0 0px rgba(255,255,255,0))',
                    ],
                    color: [
                      '#ff6b6b',
                      '#ff9f43',
                      '#4ecdc4',
                      '#45b7d1',
                      '#ff6b6b',
                    ],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 4,
                    ease: 'easeInOut',
                    times: [0, 0.25, 0.5, 0.75, 1],
                  }}
                >
                  <Icons.sparkles className="w-4 h-4" />
                </motion.span>
                <span className="text-base md:text-lg font-semibold">
                  {title}
                </span>
              </motion.h3>
              {description && <>{description}</>}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </FloatingPortal>
  );
}
