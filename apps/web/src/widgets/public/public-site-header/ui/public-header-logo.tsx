import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { siteConfig } from '@/shared/config/site';
import { Icons } from '@/shared/ui/icons';





export const PublicHeaderLogo = React.memo(
  ({ minimized }: { minimized: boolean }) => (
    <motion.div
      layout="position"
      className="flex items-center gap-2"
      transition={{ layout: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } }}
    >
      <Icons.logo />
      <div className="relative overflow-hidden whitespace-nowrap">
        <AnimatePresence mode="wait">
          <motion.span
            key={minimized ? 'short' : 'full'}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="block font-bold"
          >
            {minimized ? siteConfig.shortName : siteConfig.name}
          </motion.span>
        </AnimatePresence>
      </div>
    </motion.div>
  )
);
PublicHeaderLogo.displayName = 'PublicHeaderLogo';
