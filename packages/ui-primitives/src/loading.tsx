import { cn } from '@byte-of-me/ui-utils';

export function Loading({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      {/* CSS, not framer: `MotionConfig reducedMotion="user"` makes a framer
          rotate instant, and a spinner that stops is not a loading indicator
          (AGENTS §14 keeps `animate-spin` moving under reduced motion). */}
      <svg
        width={24}
        height={24}
        viewBox="0 0 24 24"
        className="block animate-spin [animation-duration:0.8s]"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth={3}
          fill="none"
          opacity="0.2"
        />

        <path
          d="M22 12a10 10 0 0 1-10 10"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  );
}
