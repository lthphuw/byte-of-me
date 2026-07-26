'use client';

import { type ReactNode, useState } from 'react';

import { AchievementImages } from './achievement-images';

import type { PublicEducationAchievement } from '@/entities/education/model/types';
import { ExpandableRichText } from '@/shared/ui';

interface AchievementItemProps {
  achievement: PublicEducationAchievement;
  /**
   * The achievement's rich text, rendered by the server parent. Kept out of
   * this client component so the Tiptap schema never reaches the browser.
   */
  content?: ReactNode;
}

export function AchievementItem({
  achievement: a,
  content,
}: AchievementItemProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const urls = a.images.map((i) => i.url);

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold leading-snug md:text-base">
        {a.title}
      </h4>

      {content && <ExpandableRichText>{content}</ExpandableRichText>}

      <AchievementImages
        images={a.images}
        urls={urls}
        title={a.title}
        currentSlide={currentSlide}
        onSlideChange={setCurrentSlide}
      />
    </div>
  );
}
