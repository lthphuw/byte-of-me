'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';

import { Icons } from './icons';

export interface ChatTitleProps {
  invoke: (message: string) => void;
  className?: string;
}

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export function ChatTitle({ invoke, className }: ChatTitleProps) {
  const t = useTranslations('chat');
  const isMobile = useIsMobile();

  const examplePrompts = [
    t('examples.example1'),
    t('examples.example2'),
    t('examples.example3'),
  ];

  return (
    <motion.section
      className={cn(
        'w-full flex flex-col items-center gap-4 text-center',
        className
      )}
      initial="hidden"
      animate="show"
      variants={containerVariants}
      transition={{ type: 'spring', bounce: 0.25 }}
    >
      {/* Title section */}
      <motion.div
        className="flex flex-col md:flex-row justify-center items-center gap-2 md:gap-3"
        variants={itemVariants}
      >
        <Icons.logo size={isMobile ? 32 : 48} />
        <h1 className="text-xl md:text-2xl font-semibold">
          {t("Ask Phu's Assistant")}
        </h1>
      </motion.div>

      {/* Example prompts */}
      <motion.div
        className="text-sm text-neutral-500 dark:text-neutral-400 space-y-1"
        variants={itemVariants}
      >
        <motion.ul
          className="flex flex-col flex-wrap justify-center gap-2 md:gap-3 text-sm"
          variants={containerVariants}
        >
          {examplePrompts.map((q, i) => (
            <motion.li
              key={i}
              className="container-bg cursor-pointer px-3 py-1 md:px-4 md:py-2 rounded-md shadow-md dark:shadow-[0_2px_4px_rgba(255,255,255,0.04)]"
              onClick={() => invoke(q)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 100 }}
              whileHover={{ scale: 1.05, opacity: 1 }}
            >
              {q}
            </motion.li>
          ))}
        </motion.ul>
      </motion.div>
    </motion.section>
  );
}
