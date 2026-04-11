'use client';

import { cn } from '@/shared/lib/utils';





type PublicSiteFooterLoadingProps = React.HTMLAttributes<HTMLElement>;

export function PublicSiteFooterLoading({
  className,
}: PublicSiteFooterLoadingProps) {
  return (
    <footer className={cn('py-8 relative z-20', className)}>
      <div className="container max-w-[100%] mx-auto px-4 md:px-12 flex flex-col md:flex-row justify-between items-center gap-6 animate-pulse">
        {/* Left */}
        <div className="flex flex-col items-center md:items-start gap-2">
          {/* Logo */}
          <div className="h-8 w-24 bg-muted rounded-md" />

          {/* Name */}
          <div className="h-4 w-40 bg-muted rounded-md" />
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap justify-center items-center md:items-start gap-2 md:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 w-16 bg-muted rounded-md" />
          ))}
        </div>

        {/* Right */}
        <div className="flex flex-col items-center md:items-end gap-2">
          <div className="flex gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-5 w-5 bg-muted rounded-full" />
            ))}
          </div>

          {/* Optional text */}
          <div className="h-3 w-32 bg-muted rounded-md" />
        </div>
      </div>
    </footer>
  );
}
