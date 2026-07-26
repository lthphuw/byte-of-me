'use client';

import * as React from 'react';
import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';

import { cn } from './lib/utils';

const Collapsible = CollapsiblePrimitive.Root;

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger;

/**
 * Radix exposes the open/closed state but ships no animation, so unstyled
 * content snaps open. This adds a short fade-and-lift.
 *
 * Note it does not animate height. Radix measures
 * `--radix-collapsible-content-height` when the content mounts, which is wrong
 * for any content that settles later — an async-rendering editor, a lazy
 * image — and a height tween would then run to a stale target and jump at the
 * end. Opacity needs no measurement and cannot go stale.
 */
const CollapsibleContent = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.CollapsibleContent>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleContent>
>(({ className, ...props }, ref) => (
  <CollapsiblePrimitive.CollapsibleContent
    ref={ref}
    className={cn(
      'data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down',
      'motion-reduce:animate-none',
      className
    )}
    {...props}
  />
));
CollapsibleContent.displayName =
  CollapsiblePrimitive.CollapsibleContent.displayName;

export { Collapsible, CollapsibleContent, CollapsibleTrigger };
