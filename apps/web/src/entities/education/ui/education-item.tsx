import Image from 'next/image';

import type { PublicEducation } from '@/entities/education/model/types';
import { RichText } from '@/shared/ui/rich-text';

import { AchievementItem } from './achievement-item';

export function EducationItem({
  edu,
  onOpenGallery,
}: {
  edu: PublicEducation;
  onOpenGallery: (imgs: string[], i: number) => void;
}) {
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
          <p className="text-muted-foreground text-sm">
            {new Date(edu.startDate).getFullYear()} -{' '}
            {edu.endDate ? new Date(edu.endDate).getFullYear() : 'Present'}
          </p>
        </div>
      </div>

      {edu.description && <RichText content={edu.description} />}

      {/* Achievements */}
      {edu.achievements.length > 0 && (
        <div className="border-muted space-y-3 border-l-[3px]  pl-3 md:pl-4">
          {edu.achievements.map((a) => (
            <AchievementItem
              key={a.id}
              achievement={a}
              onOpenGallery={onOpenGallery}
            />
          ))}
        </div>
      )}
    </div>
  );
}
