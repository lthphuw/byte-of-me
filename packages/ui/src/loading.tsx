'use client';

import { cn } from './lib/utils';

export type LoadingProps = {
  className?: string;
  size?: number;
  strokeWidth?: number;
};

export function Loading({
  className,
  size = 24,
  strokeWidth = 3,
}: LoadingProps) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      {/* CSS, not framer: `MotionConfig reducedMotion="user"` makes a framer
          rotate instant, and a spinner that stops is not a loading indicator
          (AGENTS §14 keeps `animate-spin` moving under reduced motion). */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        className="block animate-spin [animation-duration:0.8s]"
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

        <path
          d="M22 12a10 10 0 0 1-10 10"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  );
}
