'use client';

import {
  motion,
  useAnimate,
  type AnimationSequence,
  type Transition,
} from 'framer-motion';
import { useEffect } from 'react';

import { cn } from '@/lib/utils';

export type LoadingProps = {
  className?: string;
};

export default function Loading({ className }: LoadingProps) {
  const [scope, animate] = useAnimate();

  useEffect(() => {
    const animateLoader = async () => {
      const sequence: AnimationSequence = [
        // P animation
        [
          '.p',
          { pathLength: 1, pathOffset: 0, stroke: '#4b5563' }, // gray-700
          { duration: 0.8, ease: 'linear' } as Transition,
        ],
        [
          '.p',
          { pathLength: 0, pathOffset: 1, stroke: '#4b5563' },
          { duration: 0.4, ease: 'linear' } as Transition,
        ],
        [
          '.p',
          { stroke: 'none' }, // Hide after animation
          { duration: 0 } as Transition,
        ],
        // H animation (starts after P completes)
        [
          '.h',
          { pathLength: 1, pathOffset: 0, stroke: '#4b5563' },
          { duration: 0.8, ease: 'linear' } as Transition,
        ],
        [
          '.h',
          { pathLength: 0, pathOffset: 1, stroke: '#4b5563' },
          { duration: 0.4, ease: 'linear' } as Transition,
        ],
        [
          '.h',
          { stroke: 'none' }, // Hide after animation
          { duration: 0 } as Transition,
        ],
        // U animation (starts after H completes)
        [
          '.u',
          { pathLength: 1, pathOffset: 0, stroke: '#4b5563' },
          { duration: 0.8, ease: 'linear' } as Transition,
        ],
        [
          '.u',
          { pathLength: 0, pathOffset: 1, stroke: '#4b5563' },
          { duration: 0.4, ease: 'linear' } as Transition,
        ],
        [
          '.u',
          { stroke: 'none' }, // Hide after animation
          { duration: 0 } as Transition,
        ],
      ];

      while (true) {
        await animate(sequence);
      }
    };

    animateLoader();
  }, [animate]);

  return (
    <motion.svg
      ref={scope}
      className={cn('block mx-auto w-[80px] h-[30px]', className)}
      viewBox="0 0 80 30"
      style={{ overflow: 'visible' }}
      aria-label="Loading animation"
    >
      {/* P */}
      <motion.path
        className="p"
        initial={{ pathLength: 0, pathOffset: 0, stroke: 'none' }}
        d="M 5 25 V 5 H 15 Q 20 5 20 10 Q 20 15 15 15 H 10 V 25 Z"
        style={{
          fill: 'none',
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }}
      />
      {/* H */}
      <motion.path
        className="h"
        initial={{ pathLength: 0, pathOffset: 0, stroke: 'none' }}
        d="M 30 25 V 5 H 35 V 15 H 45 V 5 H 50 V 25 H 45 V 15 H 35 V 25 Z"
        style={{
          fill: 'none',
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }}
      />
      {/* U */}
      <motion.path
        className="u"
        initial={{ pathLength: 0, pathOffset: 0, stroke: 'none' }}
        d="M 55 5 H 60 V 20 Q 60 25 65 25 Q 70 25 70 20 V 5 H 75 V 20 Q 75 28 65 28 Q 55 28 55 20 Z"
        style={{
          fill: 'none',
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }}
      />
    </motion.svg>
  );
}