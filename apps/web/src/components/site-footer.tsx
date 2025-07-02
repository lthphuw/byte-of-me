import * as React from 'react';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { Icons } from './icons';

export function SiteFooter({ className }: React.HTMLAttributes<HTMLElement>) {
  return (
    <footer className={cn('relative z-20', className)}>
      <div className="container flex flex-col items-center justify-center gap-4 py-10 md:h-16 md:flex-row md:py-0">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <Link href={"/"}>
            <Icons.logo />
          </Link>

          <p className="text-center text-sm leading-loose md:text-center">
            Built by{' '}
            <Link
              href="mailto:lthphuw@gmail.com"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4"
            >
              lthphuw
            </Link>
          </p>
        </div>

        {/* <span>
          -
        </span>

        <Link
          href={'mailto:lthphuw@gmail.com'}
          target="_blank"
          className=""
        >
          <p className="text-base font-semibold">Email</p>
        </Link> */}

        {/* <Button
          variant={'icon'}
          className="hidden relative size-9 px-0 focus:outline-none"
        >
          <Icons.debug />
        </Button> */}
      </div>
    </footer>
  );
}
