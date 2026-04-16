'use client';

import { cn } from '@/shared/lib/utils';





type PublicSiteFooterLoadingProps = React.HTMLAttributes<HTMLElement>;

export function PublicSiteFooterLoading({
  className,
}: PublicSiteFooterLoadingProps) {
  return (
    <footer className={cn('py-8 relative z-20', className)}>
      <div className="container mx-auto flex max-w-[100%] animate-pulse flex-col items-center justify-between gap-6 px-4 md:flex-row md:px-12">
        {/* Left */}
        <div className="flex flex-col items-center gap-2 md:items-start">
          {/* Logo */}
          <div className="h-8 w-24 rounded-md bg-muted" />

          {/* Name */}
          <div className="h-4 w-40 rounded-md bg-muted" />
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap items-center justify-center gap-2 md:items-start md:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 w-16 rounded-md bg-muted" />
          ))}
        </div>

        {/* Right */}
        <div className="flex flex-col items-center gap-2 md:items-end">
          <div className="flex gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-5 w-5 rounded-full bg-muted" />
            ))}
          </div>

          {/* Optional text */}
          <div className="h-3 w-32 rounded-md bg-muted" />
        </div>
      </div>
    </footer>
  );
}
