import * as React from 'react';
import { Icons } from '@byte-of-me/ui';
import { AnimatePresence, m } from 'framer-motion';

import { siteConfig } from '@/shared/config/site';

export const PublicHeaderLogo = React.memo(
  ({ minimized }: { minimized: boolean }) => (
    <div className="flex items-center gap-2">
      <Icons.logo />
      <div className="relative overflow-hidden whitespace-nowrap">
        {/* `popLayout`, not `wait`: with `wait` the outgoing label finishes
            exiting before the incoming one mounts, so the wrapper collapses to
            zero width in between and the island snaps narrow and then wide
            again. `popLayout` takes the outgoing label out of flow at once, so
            the width changes only once. */}
        <AnimatePresence mode="popLayout" initial={false}>
          <m.span
            key={minimized ? 'short' : 'full'}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="block font-bold"
          >
            {minimized ? siteConfig.shortName : siteConfig.name}
          </m.span>
        </AnimatePresence>
      </div>
    </div>
  )
);
PublicHeaderLogo.displayName = 'PublicHeaderLogo';
