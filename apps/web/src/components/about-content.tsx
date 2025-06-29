'use client';

import { motion } from 'framer-motion';

import { FloatingToc } from '@/components/floating-toc';
import { TechGroup, TechStack } from '@/components/tech-stack';
import { Timeline, TimelineItemProps } from '@/components/timeline';

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

type AboutContentProps = {
  user: { id: string; name: string | null; aboutMe: string | null } | null;
  techGroups: TechGroup[];
  educationItems: TimelineItemProps[];
  tocItems: { href: string; label: string }[];
  sectionTitles: { aboutMe: string; education: string; skills: string };
};

export default function AboutContent({
  user,
  techGroups,
  educationItems,
  tocItems,
  sectionTitles,
}: AboutContentProps) {
  if (!user) return <p>Loading...</p>;

  return (
    <div className="relative flex justify-center px-4 lg:px-8 py-12">
      <div className="max-w-4xl w-full space-y-12">
        <motion.section
          id="aboutme"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <h2 className="text-xl md:text-3xl font-bold mb-4">
            {sectionTitles.aboutMe}
          </h2>
          <div
            className="article-text text-sm md:text-md flex flex-col gap-3"
            dangerouslySetInnerHTML={{ __html: user.aboutMe || '' }}
          />
        </motion.section>

        <motion.section
          id="education"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <Timeline
            title={sectionTitles.education}
            items={educationItems.map((item) => ({
              ...item,
              message: (
                <div
                  dangerouslySetInnerHTML={{ __html: item.message as string }}
                />
              ),
              icon: item.icon,
              subItems:
                item.subItems &&
                item.subItems.map((sub) => ({
                  title: sub.title,
                  message: (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: sub.message as string,
                      }}
                    />
                  ),
                })),
            }))}
          />
        </motion.section>

        <motion.section
          id="skills"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <h2 className="text-xl md:text-3xl font-bold mb-4">
            {sectionTitles.skills}
          </h2>
          <TechStack groups={techGroups} />
        </motion.section>

        <FloatingToc items={tocItems} />
      </div>
    </div>
  );
}
