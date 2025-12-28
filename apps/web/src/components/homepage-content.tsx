'use client';

import { Link } from '@/i18n/navigation';
import { Prisma } from '@repo/db/generated/prisma/client';
import { motion } from 'framer-motion';

import { Routes } from '@/config/global';
import { useTranslations } from '@/hooks/use-translations';
import { Button } from '@/components/ui/button';
import { GreetingWriter } from '@/components/greeting-writer';
import { ProfileQuote } from '@/components/profile-quote';





export interface HomepageContentProps {
  user: Prisma.UserGetPayload<{
    include: {
      projects: true;
    };
  }>;
}

const sectionVariants = {
  initial: { opacity: 0, y: 32 },
  animate: { opacity: 1, y: 0 },
};

export function HomepageContent({ user }: HomepageContentProps) {
  const t = useTranslations();
  const projects = user.projects?.slice(0, 2) || [];

  return (
    <main
      className="
        mx-auto max-w-6xl
        px-4 md:px-8
        py-14 md:py-20
        space-y-16 md:space-y-28
      "
    >
      <motion.section
        className="max-w-3xl mx-auto space-y-5 md:space-y-8"
        variants={sectionVariants}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <GreetingWriter text={t(user.greeting || '')} />

        <p className="text-base md:text-xl text-muted-foreground">
          {user.tagLine}
        </p>
      </motion.section>

      <motion.section
        className="grid gap-10 md:gap-14 md:grid-cols-2 items-start"
        variants={sectionVariants}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
      >
        <div className="space-y-4 md:space-y-6">
          <div className="space-y-3 md:space-y-4">
            <h2 className="text-xs md:text-sm uppercase tracking-widest text-muted-foreground">
              {t('homepage.My story')}
            </h2>

            <p className="text-sm md:text-base leading-relaxed">
              {user.bio}
            </p>
          </div>

          <Link href={Routes.About} className="inline-block">
            <Button variant="link" className="p-0 text-sm md:text-base">
              {t('homepage.More about my journey')}
            </Button>
          </Link>
        </div>

        <div className="space-y-6 md:space-y-8">
          <ProfileQuote
            quote={t(user.quote || '')}
            author={user.quoteAuthor}
          />
        </div>
      </motion.section>

      <motion.section
        className="space-y-8 md:space-y-12"
        variants={sectionVariants}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.15 }}
      >
        <div className="flex flex-col gap-3 md:gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1 md:space-y-2">
            <h2 className="text-xl md:text-3xl font-semibold">
              {t('homepage.Selected projects')}
            </h2>

            <p className="text-xs md:text-sm text-muted-foreground">
              {t('homepage.A few things I’ve built recently')}
            </p>
          </div>

          <Link href={Routes.Projects}>
            <Button variant="link" className="p-0 text-sm md:text-base">
              {t('homepage.View all projects')}
            </Button>
          </Link>
        </div>

        <div className="grid gap-4 md:gap-6 md:grid-cols-2">
          {projects.map(project => (
            <article
              key={project.id}
              className="
                rounded-xl border border-border
                p-4 md:p-6
                flex flex-col h-full
                transition hover:border-foreground/40
              "
            >
              <h3 className="text-base md:text-lg font-medium">
                {project.title}
              </h3>

              <p className="mt-2 text-xs md:text-sm text-muted-foreground leading-relaxed line-clamp-3 flex-grow">
                {project.description}
              </p>

              <Link
                href={`/projects/${project.slug}`}
                className="mt-3 md:mt-4 self-start"
              >
                <Button variant="ghost" size="sm">
                  {t('homepage.View project')}
                </Button>
              </Link>
            </article>
          ))}
        </div>
      </motion.section>

      <motion.section
        className="
          rounded-2xl border border-border
          p-6 md:p-10 lg:p-14
          text-center
          space-y-4 md:space-y-6
        "
        variants={sectionVariants}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
      >
        <h2 className="text-xl md:text-3xl font-semibold">
          {t('homepage.Have an idea in mind?')}
        </h2>

        <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
          {t('homepage.Always interested in thoughtful projects and good collaboration')}
        </p>

        <div className="flex items-stretch flex-col md:flex-row justify-center gap-3 md:gap-4 flex-wrap pt-2">
          <a
            href={`mailto:${user.email}?subject=${encodeURIComponent(
              t('homepage.Let’s work together')
            )}`}
          >
            <Button size="lg" className="h-11 md:h-12 w-full">
              {t('homepage.Email me')}
            </Button>
          </a>

          <Link href={Routes.Contact}>
            <Button size="lg" variant="outline" className="h-11 md:h-12 w-full">
              {t('homepage.Contact details')}
            </Button>
          </Link>
        </div>
      </motion.section>
    </main>
  );
}
