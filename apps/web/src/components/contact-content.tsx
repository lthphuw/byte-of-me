'use client';

import { Link } from '@/i18n/navigation';
import { Variants, motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

import { ContactForm } from '@/components/contact-form';
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
  userId: string;
  email?: string;
  linkedIn?: string;
  github?: string;
};

export function ContactContent({
                                 userId,
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
      description: t('linkedIn'),
      icon: Icons.linkedin,
    },
    github && {
      href: github,
      label: 'GitHub',
      description: t('gitHub'),
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
        flex
        items-center
        justify-center
        px-4
      "
    >
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <motion.div
          id={"contact-info"}
          variants={itemVariants}
          className="text-center space-y-2"
        >
          <h1 className="text-2xl md:text-4xl font-semibold tracking-tight">
            {t('letsWorkTogether')}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {t('feelFreeToReachOutThroughAnyChannel')}
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

        <motion.div
          id={"contact-send-message"} variants={itemVariants} className="pt-6">
          <div className="text-center text-xs text-muted-foreground mb-4">
            {t('or')}
          </div>

          <div className="rounded-lg border border-border p-4 space-y-4">
            <p className="text-sm font-medium text-center">
              {t('sendMeADirectMessage')}
            </p>

            <ContactForm userId={userId} />
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
