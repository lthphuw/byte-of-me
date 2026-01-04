'use client';

import { User } from '@repo/db/generated/prisma/client';
import { motion } from 'framer-motion';
import { GraduationCap, Layers, User as UserIcon } from 'lucide-react';

import { useTranslations } from '@/hooks/use-translations';
import { RichText } from '@/components/rich-text';
import { TechGroup, TechStackGroup } from '@/components/tech-stack-group';
import { EducationTimeline, EducationTimelineItemProps } from '@/components/timeline';

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
} as any;

type AboutContentProps = {
  user: User;
  techGroups: TechGroup[];
  educationItems: EducationTimelineItemProps[];
};

export function AboutContent({
  user,
  techGroups,
  educationItems,
}: AboutContentProps) {
  const t = useTranslations();

  return (
    <div className="relative flex justify-center px-4 md:px-8 py-12">
      <div className="relative w-full max-w-4xl space-y-16">
        {/* ABOUT ME */}
        <motion.section
          id="aboutme"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2">
            <UserIcon className="size-4 md:size-6" />
            <h2 className="text-xl md:text-3xl font-bold">
              {t('about.section.aboutMe')}
            </h2>
          </div>

          <RichText html={user.aboutMe} />
        </motion.section>

        {/* EDUCATION */}
        <motion.section
          id="education"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="space-y-6"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <GraduationCap className="size-4 md:size-6" />
              <h2 className="text-xl md:text-3xl font-bold">
                {t('about.section.education')}
              </h2>
            </div>
          </div>

          <EducationTimeline
            items={educationItems.map((item) => ({
              ...item,
              message: (
                <RichText html={item.message as string} />
              ),
              subItems:
                item.subItems &&
                item.subItems.map((sub) => ({
                  title: sub.title,
                  message: (
                    <RichText html={sub.message as string} />
                  ),
                })),
            }))}
          />
        </motion.section>

        {/* SKILLS */}
        <motion.section
          id="skills"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="space-y-6"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Layers className="size-4 md:size-6" />
              <h2 className="text-xl md:text-3xl font-bold">
                {t('about.section.skillsTechStack')}
              </h2>
            </div>
          </div>

          <TechStackGroup groups={techGroups} />
        </motion.section>
      </div>
    </div>
  );
}
