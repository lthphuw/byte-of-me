'use client';

import Image from 'next/image';
import { BaseComponentProps } from '@/types';
import { Prisma } from '@repo/db/generated/prisma/client';
import { motion } from 'framer-motion';

import { DateHelper } from '@/lib/core/date-helper';
import { RichText } from '@/components/rich-text';
import { TechstacksProject } from '@/components/techstacks-project';





export type CompanyExperience = Prisma.ExperienceGetPayload<{
  include: {
    roles: {
      include: {
        tasks: true;
      };
    };
    techstacks: {
      include: {
        techstack: true;
      };
    };
  };
}>;

export type ExperienceTimelineProps = BaseComponentProps & {
  experienceData: CompanyExperience[];
};

export default function ExperienceTimeline({
                                             experienceData,
                                             className,
                                             style,
                                           }: ExperienceTimelineProps) {
  return (
    <section
      className={`mx-auto max-w-4xl px-4 py-12 md:py-16 ${className}`}
      style={style}
    >
      <div className="space-y-14">
        {experienceData.map((company, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="relative flex gap-x-6"
          >
            {/* Avatar + line */}
            <div className="relative flex flex-col items-center shrink-0">
                <motion.span
                  initial={{ scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="absolute top-6 bottom-0 rounded-3xl w-[2px] origin-top bg-border/70 last:hidden"
                />

                {/* Avatar */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="relative z-10 flex size-10 items-center justify-center rounded-full bg-background"
                >
                    <Image
                      src={company.logoUrl}
                      alt={company.company}
                      fill
                      className="rounded-full object-contain"
                    />
                </motion.div>
            </div>

            {/* Content */}
            <div className="flex-1 pb-2">
              <h3 className="text-lg md:text-xl font-semibold tracking-tight">
                {company.company}
              </h3>

              <TechstacksProject
                techs={company.techstacks.map(it => it.techstack)}
              />

              <div className="mt-5 space-y-6">
                {company.roles.map((role, rIdx) => (
                  <div key={rIdx} className="space-y-1">
                    <p className="text-base md:text-lg font-medium">
                      {role.title}
                    </p>

                    <p className="text-xs md:text-sm text-muted-foreground">
                      {DateHelper.formatDate(role.startDate)} –{' '}
                      {DateHelper.formatDate(role.endDate)} (
                      {DateHelper.calculateDuration(
                        role.startDate,
                        role.endDate,
                      )}
                      ) • {company.location} • {company.type}
                    </p>

                    <ul className="mt-3 space-y-1.5 pl-4 text-sm md:text-base list-disc marker:text-muted-foreground">
                      {role.tasks.map((task, tIdx) => (
                        <li key={tIdx}>
                          <RichText html={task.content || ''} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
