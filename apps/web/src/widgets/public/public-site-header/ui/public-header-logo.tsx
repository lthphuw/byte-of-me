import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { siteConfig } from '@/shared/config/site';
import { Icons } from '@/shared/ui';

export const PublicHeaderLogo = React.memo(
  ({ minimized }: { minimized: boolean }) => (
    <div
      className="flex items-center gap-2"
      // layout="position"
      // transition={{ layout: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } }}
    >
      <Icons.logo />
      <div className="relative overflow-hidden whitespace-nowrap">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={minimized ? 'short' : 'full'}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="block font-bold"
          >
            {minimized ? siteConfig.shortName : siteConfig.name}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  )
);
PublicHeaderLogo.displayName = 'PublicHeaderLogo';
