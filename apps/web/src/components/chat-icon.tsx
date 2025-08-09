'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { FloatingPortal } from '@floating-ui/react';

import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';

import { Icons } from './icons';
import { Button } from '@/components/ui/button';

export interface ChatIconProps {
  className?: string;
  style?: React.CSSProperties;
}

export function ChatIcon({ className, style }: ChatIconProps) {
  const isMobile = useIsMobile();
  const pathname = usePathname();

  if (!isMobile || pathname.includes('/ask-me')) return null;

  return (
    <FloatingPortal>
      <Link
        href="/ask-me"
        className={cn(
          'fixed bottom-12 right-3 z-[9999]',
          'group pointer-events-auto',
          className
        )}
        style={style}
      >
        <Button
          variant="secondary"
          className="rounded-full !size-12 p-4 backdrop-blur-md backdrop-invert-0 backdrop-saturate-200 !shadow-md dark:!shadow-[0_4px_10px_rgba(255,255,255,0.05)]"
        >
          <Icons.chat className="!size-8" />
        </Button>
      </Link>
    </FloatingPortal>
  );
}
