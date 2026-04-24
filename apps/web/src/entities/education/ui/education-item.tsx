import Image from 'next/image';

import { AchievementItem } from './achievement-item';

import type { PublicEducation } from '@/entities/education/model/types';
import { RichText } from '@/shared/ui';

export function EducationItem({ edu }: { edu: PublicEducation }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        {edu.logo && (
          <Image
            src={edu.logo.url}
            alt={edu.title}
            width={48}
            height={48}
            className="rounded-md object-contain"
          />
        )}
        <div>
          <h3 className="text-lg font-semibold">{edu.title}</h3>
          <p className="text-sm text-muted-foreground">
            {new Date(edu.startDate).getFullYear()} -{' '}
            {edu.endDate ? new Date(edu.endDate).getFullYear() : 'Present'}
          </p>
        </div>
      </div>

      {edu.description && <RichText content={edu.description} />}

      {/* Achievements */}
      {edu.achievements.length > 0 && (
        <div className="space-y-3 border-l-[3px] border-muted  pl-3 md:pl-4">
          {edu.achievements.map((a) => (
            <AchievementItem key={a.id} achievement={a} />
          ))}
        </div>
      )}
    </div>
  );
}
