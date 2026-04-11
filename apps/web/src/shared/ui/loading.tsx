'use client';

import { cn } from '@/shared/lib/utils';
import { motion } from 'framer-motion';

export type LoadingProps = {
  className?: string;
  size?: number;
  strokeWidth?: number;
};

export default function Loading({
  className,
  size = 24,
  strokeWidth = 3,
}: LoadingProps) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        className="block"
        animate={{ rotate: 360 }}
        transition={{
          repeat: Infinity,
          duration: 0.8,
          ease: 'linear',
        }}
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          opacity="0.2"
        />

        <motion.path
          d="M22 12a10 10 0 0 1-10 10"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
        />
      </motion.svg>
    </div>
  );
}
