'use client';

import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { Prisma } from '@repo/db/generated/prisma/client';
import { motion } from 'framer-motion';

import { DateHelper } from '@/lib/core/date-helper';
import { RichText } from '@/components/rich-text';

import { Badge } from './ui/badge';

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

interface ExperienceTimelineProps {
  experienceData: CompanyExperience[];
  className?: string;
  style?: React.CSSProperties;
}

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
      <div
        className="relative space-y-12 before:absolute before:left-6 before:top-0 before:bottom-0 before:w-0.5 before:bg-border md:before:left-6">
        {experienceData.map((company, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              ease: 'easeOut',
              duration: 0.4,
              delay: idx * 0.3,
            }}
            className="flex items-start gap-6 relative"
          >
            <div className="flex-shrink-0 relative w-12 h-12 z-10 bg-background rounded-full p-1 shadow-md">
              <Image
                src={company.logoUrl}
                alt={company.company}
                className="aspect-square size-full object-center object-contain rounded-full"
                fill
              />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">
                {company.company}
              </h3>
              <TechStack
                techs={company.techstacks.map((it) => it.techstack.name)}
              />
              <div className="mt-4 space-y-6">
                {company.roles.map((role, rIdx) => (
                  <div key={rIdx} className="pl-0 md:pl-2">
                    <p className="font-medium text-base sm:text-lg">
                      {role.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {DateHelper.formatDate(role.startDate)} –{' '}
                      {DateHelper.formatDate(role.endDate)} (
                      {DateHelper.calculateDuration(
                        role.startDate,
                        role.endDate,
                      )}
                      ) • {company.location} • {company.type}
                    </p>
                    <ul className="mt-3 list-disc pl-5 text-sm sm:text-base space-y-1">
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

function TechStack({ techs }: { techs: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {techs.map((tech, idx) => (
        <Link key={idx} href={'#'} className="inline-block">
          <Badge variant={'secondary'} className="text-xs px-2 py-1">
            {tech}
          </Badge>
        </Link>
      ))}
    </div>
  );
}
