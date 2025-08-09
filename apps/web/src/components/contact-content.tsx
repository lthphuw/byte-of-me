'use client';

import { Link } from '@/i18n/navigation';
import { Variants, motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

import { Icons } from '@/components/icons';





const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
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
        <h1 className="scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0">
          {t('Connect With Me')}
        </h1>
        <p className="mt-2 text-base md:text-xl text-muted-foreground border-b pb-2">
          {t("Reach out, let's code the future!")}
        </p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        className="grid grid-cols-2 gap-4 md:gap-10"
      >
        {[
          {
            href: 'mailto:lthphuw@gmail.com',
            icon: <Icons.email size={48} />,
            label: 'Email',
          },
          {
            href: 'https://linkedin.com/in/phu-lth',
            icon: <Icons.linkedin size={48} />,
            label: 'Linkedin',
          },
          {
            href: 'https://github.com/lthphuw',
            icon: <Icons.github size={48} />,
            label: 'Github',
          },
          {
            href: 'https://www.facebook.com/lthphu2011',
            icon: <Icons.facebook size={48} />,
            label: 'Facebook',
          },
        ].map((item, index) => (
          <motion.div
            whileHover={{
              scale: 1.05
            }}
            id={index.toString()}
            key={item.href}
            variants={itemVariants}
          >
            <div className="container-bg cursor-pointer px-4 py-2 md:py-4 w-full min-h-[97px] md:w-[216px] md:min-h-[184px] flex flex-col justify-center align-center rounded-xl gap-4 shadow-lg dark:shadow-[0_2px_12px_rgba(255,255,255,0.05)]">
              <Link
                href={item.href}
                target="_blank"
                className="flex flex-col items-center justify-center gap-4 w-full h-full px-4 py-4"
              >
                {item.icon}
                <p className="scroll-m-20 text-base font-semibold tracking-tight">{item.label}</p>
              </Link>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
