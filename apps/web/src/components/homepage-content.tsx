'use client';

import { Link } from '@/i18n/navigation';
import { Project } from '@/models/project';
import { UserProfile } from '@/models/user-profile';
import { motion } from 'framer-motion';
import { Route } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Routes } from '@/config/global';
import { Button } from '@/components/ui/button';
import { EmptyProject } from '@/components/empty-project';
import { GreetingWriter } from '@/components/greeting-writer';
import { ProfileQuote } from '@/components/profile-quote';
import { ProjectCard } from '@/components/project-card';

export interface HomepageContentProps {
  userProfile: UserProfile;
  recentProjects: Project[];
}

const sectionVariants = {
  initial: { opacity: 0, y: 32 },
  animate: { opacity: 1, y: 0 },
};

export function HomepageContent({
  userProfile,
  recentProjects,
}: HomepageContentProps) {
  const t = useTranslations('homepage');

  const hasQuote = !!userProfile.quote;

  return (
    <main
      id="home"
      className="mx-auto max-w-6xl px-0 md:px-8 py-14 md:py-20 space-y-16 md:space-y-28"
    >
      {/* HERO / GREETING */}
      <motion.section
        id="hero"
        className="max-w-3xl mx-auto space-y-5 md:space-y-8 text-left"
        variants={sectionVariants}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <GreetingWriter text={userProfile.greeting || ''} />
        <p className="text-base md:text-xl text-muted-foreground">
          {userProfile.tagLine}
        </p>
      </motion.section>

      {/* ABOUT / MY STORY */}
      <motion.section
        id="about"
        className={`grid gap-10 md:gap-14 items-start ${
          hasQuote ? 'md:grid-cols-2' : 'max-w-3xl mx-auto grid-cols-1'
        }`}
        variants={sectionVariants}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
      >
        <div className="space-y-6 md:space-y-8">
          <div className="space-y-4 md:space-y-5">
            <h2 className="text-xs md:text-sm uppercase tracking-[0.2em] text-muted-foreground font-semibold">
              {t('myStory')}
            </h2>

            <div className="text-sm md:text-base leading-relaxed text-muted-foreground">
              {userProfile.bio}
            </div>
          </div>

          <div className="space-y-4">
            <Link href={Routes.About}>
              <Button
                variant="link"
                className="p-0 h-auto text-sm md:text-base group"
              >
                {t('moreAboutMyJourney')} <Route />
              </Button>
            </Link>
          </div>
        </div>

        {hasQuote && (
          <div className="flex justify-center md:justify-end">
            <ProfileQuote
              quote={userProfile.quote || ''}
              author={userProfile.quoteAuthor || ''}
            />
          </div>
        )}
      </motion.section>

      {/* SELECTED PROJECTS */}
      <motion.section
        id="projects"
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
              {t('selectedProjects')}
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground">
              {t('aFewThingsIveBuiltRecently')}
            </p>
          </div>
          <Link href={Routes.Projects}>
            <Button variant="link" className="p-0 text-sm md:text-base h-auto">
              {t('viewAllProjects')}
            </Button>
          </Link>
        </div>

        <div className="grid gap-4 md:gap-6 md:grid-cols-2">
          {recentProjects.length === 0 ? (
            <EmptyProject className="col-span-full" />
          ) : (
            recentProjects.map((project) => (
              <ProjectCard key={project.id} project={project} compact />
            ))
          )}
        </div>
      </motion.section>

      {/* CONTACT CTA */}
      <motion.section
        id="contact-cta"
        className="rounded-2xl border bg-card/50 p-6 md:p-10 lg:p-14 text-center space-y-4 md:space-y-6"
        variants={sectionVariants}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
      >
        <h2 className="text-xl md:text-3xl font-semibold">
          {t('haveAnIdeaInMind')}
        </h2>
        <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
          {t('alwaysInterestedInThoughtfulProjectsAndGoodCollaboration')}
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
          <Link href={`${Routes.Contact}#contact-send-message`}>
            <Button size="lg" className="w-full sm:w-auto px-8">
              {t('emailMe')}
            </Button>
          </Link>
          <Link href={`${Routes.Contact}#contact-info`}>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto px-8"
            >
              {t('contactDetails')}
            </Button>
          </Link>
        </div>
      </motion.section>
    </main>
  );
}
