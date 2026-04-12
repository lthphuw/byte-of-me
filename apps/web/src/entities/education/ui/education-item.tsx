import Image from 'next/image';
import { PublicEducation } from '@/entities/education/model/types';
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
          <h3 className="font-semibold text-lg">{edu.title}</h3>
          <p className="text-sm text-muted-foreground">
            {new Date(edu.startDate).getFullYear()} -{' '}
            {edu.endDate ? new Date(edu.endDate).getFullYear() : 'Present'}
          </p>
        </div>
      </div>

      {edu.description && <RichText content={edu.description} />}

      {/* Achievements */}
      {edu.achievements.length > 0 && (
        <div className="pl-3 space-y-3 border-l-[3px]  border-muted md:pl-4">
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
