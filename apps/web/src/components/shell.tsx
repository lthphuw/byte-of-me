import * as React from 'react';

import { cn } from '@/lib/utils';





type ShellProps = React.HTMLAttributes<HTMLDivElement>;

function ShellBase({ children, className, ...props }: ShellProps) {
  return (
    <section
      className={cn(
        'mx-auto w-full px-4 pb-16 pt-20 sm:px-6 sm:pt-32 z-20',
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function HomeShell({ className, ...props }: ShellProps) {
  return (
    <ShellBase
      className={cn('flex max-w-3xl flex-col gap-8', className)}
      {...props}
    />
  );
}

export function AboutShell({ className, ...props }: ShellProps) {
  return (
    <ShellBase
      className={cn('max-w-3xl', className)}
      {...props}
    />
  );
}

export function ExperienceShell({ className, ...props }: ShellProps) {
  return (
    <ShellBase
      className={cn('flex max-w-5xl flex-col gap-8', className)}
      {...props}
    />
  );
}

export function ProjectsShell({ className, ...props }: ShellProps) {
  return (
    <ShellBase
      className={cn('flex max-w-5xl flex-col gap-8', className)}
      {...props}
    />
  );
}

export function ProjectDetailsShell({ className, ...props }: ShellProps) {
  return (
    <ShellBase
      className={cn('flex max-w-5xl flex-col gap-8', className)}
      {...props}
    />
  );
}

export function HobbiesShell({ className, ...props }: ShellProps) {
  return (
    <ShellBase
      className={cn('flex max-w-5xl flex-col gap-8', className)}
      {...props}
    />
  );
}

export function MoreShell({ className, ...props }: ShellProps) {
  return (
    <ShellBase
      className={cn('flex max-w-5xl flex-col gap-8', className)}
      {...props}
    />
  );
}

export function ContactShell({ className, ...props }: ShellProps) {
  return (
    <ShellBase
      className={cn('flex max-w-5xl flex-col gap-8', className)}
      {...props}
    />
  );
}

export function CVShell({ className, ...props }: ShellProps) {
  return (
    <ShellBase
      className={cn('flex max-w-5xl flex-col gap-8', className)}
      {...props}
    />
  );
}

export function AskMeShell({ className, ...props }: ShellProps) {
  return (
    <ShellBase
      className={cn('flex max-w-5xl flex-col gap-8', className)}
      {...props}
    />
  );
}

export function DashboardShell({ className, ...props }: ShellProps) {
  return (
    <ShellBase
      className={cn('flex max-w-5xl flex-col gap-8', className)}
      {...props}
    />
  );
}
