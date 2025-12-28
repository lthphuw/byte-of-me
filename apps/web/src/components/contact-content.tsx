'use client';

import { Link } from '@/i18n/navigation';
import { Variants, motion } from 'framer-motion';

import { useTranslations } from '@/hooks/use-translations';
import { Icons } from '@/components/icons';





const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.25, staggerChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: 'easeOut' },
  },
};

export type ContactContentProps = {
  email?: string;
  linkedIn?: string;
  github?: string;
};

export function ContactContent({
                                 email,
                                 linkedIn,
                                 github,
                               }: ContactContentProps) {
  const t = useTranslations('contact');

  const contacts = [
    email && {
      href: `mailto:${email}`,
      label: 'Email',
      description: email,
      icon: Icons.email,
    },
    linkedIn && {
      href: linkedIn,
      label: 'LinkedIn',
      description: t('LinkedIn'),
      icon: Icons.linkedin,
    },
    github && {
      href: github,
      label: 'GitHub',
      description: t('GitHub'),
      icon: Icons.github,
    },
  ].filter(Boolean) as {
    href: string;
    label: string;
    description: string;
    icon: React.ComponentType<{ size?: number }>;
  }[];

  if (contacts.length === 0) return null;

  return (
    <motion.section
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="
        h-[50vh]
        flex
        items-center
        justify-center
        px-4
      "
    >
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <motion.div
          variants={itemVariants}
          className="text-center space-y-2"
        >
          <h1 className="text-2xl md:text-4xl font-semibold tracking-tight">
            {t("Let’s work together")}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {t('Feel free to reach out through any channel')}
          </p>
        </motion.div>

        {/* Contact items */}
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 gap-3"
        >
          {contacts.map((item) => {
            const Icon = item.icon;

            return (
              <motion.div key={item.href} variants={itemVariants}>
                <Link
                  href={item.href}
                  target="_blank"
                  className="
                    group
                    flex
                    items-center
                    gap-4
                    rounded-lg
                    border
                    border-border
                    px-4
                    py-3
                    transition
                    hover:bg-muted/50
                    focus:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-ring
                  "
                >
                  {/* Icon */}
                  <div
                    className="
                      flex
                      size-10
                      items-center
                      justify-center
                      rounded-md
                      border
                      border-border
                      text-muted-foreground
                      transition
                      group-hover:-translate-y-0.5
                      group-hover:text-foreground
                    "
                  >
                    <Icon size={18} />
                  </div>

                  {/* Text */}
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {item.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </div>

                  <span
                    className="
                      ml-auto
                      text-xs
                      text-muted-foreground
                      transition
                      opacity-60
                    "
                  >
                    ↗
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </motion.section>
  );
}
