'use client';

import { Link } from '@/i18n/navigation';
import { motion } from 'framer-motion';

import AvatarWithFallback from './ui/avatar-with-fallback';
import { Badge } from './ui/badge';

const TechStack: React.FC<{ techs: string[] }> = ({ techs }) => {
  return (
    <div className="flex flex-wrap gap-2">
      {techs.map((tech, idx) => (
        <Link key={idx} href={'#'} className="inline-block">
          <Badge variant="secondary" className="text-xs">
            {tech}
          </Badge>
        </Link>
      ))}
    </div>
  );
};

interface Role {
  title: string;
  from: string;
  to: string;
  duration: string;
  location: string;
  type: string;
  tasks: string[];
}

export interface CompanyExperience {
  company: string;
  logoUrl: string;
  roles: Role[];
  techStack: string[];
}

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
      className={`mx-auto px-4 py-12 md:py-16 ${className}`}
      style={style}
    >
      <div className="space-y-12">
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
            className="flex flex-col sm:flex-row items-start gap-4"
          >
            <div className="flex-shrink-0">
              <AvatarWithFallback
                src={company.logoUrl}
                alt={company.company}
                fallbackSrc="/images/experiences/placeholder.png"
                fallbackText="?"
                size={40}
                className="rounded-lg"
              />
            </div>
            <div className="flex-1 gap-2">
              <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">
                {company.company}
              </h3>
              <TechStack techs={company.techStack} />
              <div className="mt-2 md:mt-4 space-y-6">
                {company.roles.map((role, rIdx) => (
                  <div
                    key={rIdx}
                    className="border-l-2 border-border pl-4 sm:pl-6"
                  >
                    <p className="font-medium text-base sm:text-lg">
                      {role.title}
                    </p>
                    <p className="text-sm italic">
                      {role.from} – {role.to} ({role.duration}) •{' '}
                      {role.location} • {role.type}
                    </p>
                    <ul className="mt-2 list-disc pl-5 text-sm sm:text-base">
                      {role.tasks.map((task, tIdx) => (
                        <li key={tIdx}>{task}</li>
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
