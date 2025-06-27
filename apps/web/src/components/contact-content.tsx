'use client';

import Link from 'next/link';
import { Variants, motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

import { Icons } from '@/components/icons';
import { LiquidGlass } from '@/components/liquid-glass';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2, delayChildren: 0.3 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
  },
};
export function ContactContent() {
  const t = useTranslations('contact');

  return (
    <motion.div
      className="w-full max-w-md mx-auto mt-12 md:mt-16"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="text-center mb-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
          {t('Connect With Me')}
        </h1>
        <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
          {t("Reach out, let's code the future!")}
        </p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        className="grid grid-cols-2 gap-4"
      >
        <motion.div variants={itemVariants}>
          <LiquidGlass
            variant="card"
            intensity="medium"
            disableRipple
            disableStretch
            disableHoverCursor
          >
            <Link
              href={'mailto:lthphuw@gmail.com'}
              target="_blank"
              className="flex flex-col cursor-pointer items-center justify-center gap-4 w-full h-full px-4 py-4"
            >
              <Icons.email size={48} />
              <p className="text-base font-semibold">Email</p>
            </Link>
          </LiquidGlass>
        </motion.div>

        <motion.div variants={itemVariants}>
          <LiquidGlass
            variant="card"
            intensity="medium"
            disableRipple
            disableStretch
            disableHoverCursor
          >
            <Link
              href={'https://linkedin.com/in/phu-lth'}
              target="_blank"
              className="flex flex-col cursor-pointer items-center justify-center gap-4 w-full h-full px-4 py-4"
            >
              <Icons.linkedin size={48} />
              <p className="text-base font-semibold">Linkedin</p>
            </Link>
          </LiquidGlass>
        </motion.div>

        <motion.div variants={itemVariants}>
          <LiquidGlass
            variant="card"
            intensity="medium"
            disableRipple
            disableStretch
            disableHoverCursor
          >
            <Link
              href={'https://github.com/lthphuw'}
              target="_blank"
              className="flex flex-col cursor-pointer items-center justify-center gap-4 w-full h-full px-4 py-4"
            >
              <Icons.github size={48} />
              <p className="text-base font-semibold">Github</p>
            </Link>
          </LiquidGlass>
        </motion.div>

        <motion.div variants={itemVariants}>
          <LiquidGlass
            variant="card"
            intensity="medium"
            disableRipple
            disableStretch
            disableHoverCursor
          >
            <Link
              href={'https://www.facebook.com/lthphu2011'}
              target="_blank"
              className="flex flex-col cursor-pointer items-center justify-center gap-4 w-full h-full px-4 py-4"
            >
              <Icons.facebook size={48} />
              <p className="text-base font-semibold">Facebook</p>
            </Link>
          </LiquidGlass>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
