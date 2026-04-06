'use client';

import { Education } from '@/models/education';
import { TechStack } from '@/models/tech-stack';
import { UserProfile } from '@/models/user-profile';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

import { EducationSection } from '@/components/education-section';
import { RichText } from '@/components/rich-text';
import { TechStackSection } from '@/components/tech-stack-section';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
} as const;

type Props = {
  userProfile: UserProfile;
  techStacks: TechStack[];
  educations: Education[];
};

export function AboutContent({ userProfile, techStacks, educations }: Props) {
  const t = useTranslations();

  return (
    <div className="flex justify-center px-0 md:px-8 py-8">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        className="w-full max-w-4xl space-y-20"
      >
        {userProfile.aboutMe && (
          <motion.section variants={itemVariants} className="space-y-6">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl md:text-4xl font-bold tracking-tight">
                {t('about.section.aboutMe')}
              </h2>
            </div>
            <div className="pl-0 ml-0.5">
              <RichText content={userProfile.aboutMe} />
            </div>
          </motion.section>
        )}

        <motion.section variants={itemVariants} className="space-y-8">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight">
              {t('about.section.education')}
            </h2>
          </div>
          <div className="pl-0">
            <EducationSection educations={educations} />
          </div>
        </motion.section>

        <motion.section variants={itemVariants} className="space-y-8">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight">
              {t('about.section.skillsTechStack')}
            </h2>
          </div>
          <div className="pl-0">
            <TechStackSection techStacks={techStacks} />
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}
