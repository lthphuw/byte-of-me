import * as React from 'react';
import { motionDuration, motionEase } from '@byte-of-me/ui/motion';
import { AnimatePresence, m } from 'framer-motion';

import { siteConfig } from '@/shared/config/site';
import { BrandMark } from '@/shared/ui/brand-mark';

export const PublicHeaderLogo = React.memo(
  ({ minimized }: { minimized: boolean }) => (
    <div className="flex items-center gap-2">
      <BrandMark />
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
            // The outgoing label leaves faster and accelerates away, so it
            // never overlaps the incoming one for long.
            exit={{
              y: -10,
              opacity: 0,
              transition: {
                duration: motionDuration.press,
                ease: motionEase.in,
              },
            }}
            transition={{
              duration: motionDuration.fast,
              ease: motionEase.out,
            }}
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
