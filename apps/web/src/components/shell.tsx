import * as React from 'react';

import { cn } from '@/lib/utils';

type HomeShellProps = React.HTMLAttributes<HTMLDivElement>;
type AboutShellProps = React.HTMLAttributes<HTMLDivElement>;

export function HomeShell({ children, className, ...props }: HomeShellProps) {
  return (
    <>
      <section
        className={cn(
          'mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pb-16 pt-20 sm:px-6 sm:pt-32 z-20',
          className
        )}
        {...props}
      >
        {children}
      </section>
    </>
  );
}

export function AboutShell({ children, className, ...props }: AboutShellProps) {
  return (
    <section
      className={cn(
        'mx-auto w-full px-4 pb-16 pt-20 sm:px-6 z-20 sm:pt-32',
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function ExperienceShell({
  children,
  className,
  ...props
}: AboutShellProps) {
  return (
    <section
      className={cn(
        'mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-16 pt-20 z-20 sm:px-6 sm:pt-32',
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function ProjectsShell({
  children,
  className,
  ...props
}: AboutShellProps) {
  return (
    <section
      className={cn(
        'mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-16 pt-20 sm:px-6 z-20 sm:pt-32',
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function ProjectDetailsShell({
  children,
  className,
  ...props
}: AboutShellProps) {
  return (
    <section
      className={cn(
        'mx-auto flex w-full  max-w-5xl flex-col gap-8 px-4 pb-16 pt-20 sm:px-6 z-20 sm:pt-32',
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function HobbiesShell({
  children,
  className,
  ...props
}: AboutShellProps) {
  return (
    <section
      className={cn(
        'mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-16 pt-20 z-20 sm:px-6 sm:pt-32',
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function MoreShell({ children, className, ...props }: AboutShellProps) {
  return (
    <section
      className={cn(
        'mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-16 pt-20 z-20 sm:px-6 sm:pt-32',
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function ContactShell({
  children,
  className,
  ...props
}: AboutShellProps) {
  return (
    <section
      className={cn(
        'mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-16 pt-20 z-20 sm:px-6 sm:pt-32',
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function CVShell({ children, className, ...props }: AboutShellProps) {
  return (
    <section
      className={cn(
        'mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-16 pt-20 z-20 sm:px-6 sm:pt-32',
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function AskMeShell({ children, className, ...props }: AboutShellProps) {
  return (
    <section
      className={cn(
        'mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-16 pt-20 z-20 sm:px-6 sm:pt-32',
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}
