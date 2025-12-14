'use client';

import { CSSProperties, useEffect, useMemo } from 'react';
import {
  motion,
  useAnimate,
  type AnimationSequence,
  type Transition,
} from 'framer-motion';

import { cn } from '@/lib/utils';

export type LoadingProps = {
  className?: string;
  width?: number; // SVG width
  height?: number; // SVG height
  strokeColor?: string; // Stroke color
};

export default function Loading({
  className,
  width = 80,
  height = 30,
  strokeColor = '#4b5563', // gray-700
}: LoadingProps) {
  const [scope, animate] = useAnimate();

  useEffect(() => {
    const runAnimation = async () => {
      const letters = ['.p', '.h', '.u'];
      const buildSequence = (selector: string): AnimationSequence => [
        [
          selector,
          { pathLength: 1, pathOffset: 0, stroke: strokeColor },
          {
            duration: 0.8,
            ease: 'linear',
          } as Transition,
        ],
        [
          selector,
          { pathLength: 0, pathOffset: 1, stroke: strokeColor },
          {
            duration: 0.4,
            ease: 'linear',
          } as Transition,
        ],
        [selector, { stroke: 'none' }, { duration: 0 } as Transition],
      ];

      while (true) {
        for (const letter of letters) {
          await animate(buildSequence(letter));
        }
      }
    };

    runAnimation();
  }, [animate, strokeColor]);

  const commonStyle = useMemo(
    () =>
      ({
        fill: 'none',
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      } as CSSProperties),
    []
  );

  return (
    <motion.svg
      ref={scope}
      className={cn('block mx-auto', className)}
      viewBox="0 0 80 30"
      width={width}
      height={height}
      style={{ overflow: 'visible' }}
      aria-label="Loading animation"
    >
      {/* P */}
      <motion.path
        className="p"
        initial={{ pathLength: 0, pathOffset: 0, stroke: 'none' }}
        d="M 5 25 V 5 H 15 Q 20 5 20 10 Q 20 15 15 15 H 10 V 25 Z"
        style={commonStyle}
      />

      {/* H */}
      <motion.path
        className="h"
        initial={{ pathLength: 0, pathOffset: 0, stroke: 'none' }}
        d="M 30 25 V 5 H 35 V 15 H 45 V 5 H 50 V 25 H 45 V 15 H 35 V 25 Z"
        style={commonStyle}
      />

      {/* U */}
      <motion.path
        className="u"
        initial={{ pathLength: 0, pathOffset: 0, stroke: 'none' }}
        d="M 55 5 H 60 V 20 Q 60 25 65 25 Q 70 25 70 20 V 5 H 75 V 20 Q 75 28 65 28 Q 55 28 55 20 Z"
        style={commonStyle}
      />
    </motion.svg>
  );
}
