'use client';

import { useState } from 'react';
import { ExpandableText } from '@byte-of-me/ui';

import { AchievementImages } from './achievement-images';

import type { PublicEducationAchievement } from '@/entities/education/model/types';

export function AchievementItem({
  achievement: a,
}: {
  achievement: PublicEducationAchievement;
}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const urls = a.images.map((i) => i.url);

  return (
    <div className="space-y-1 md:space-y-2">
      <h4 className="font-medium">{a.title}</h4>

      {a.content && <ExpandableText content={a.content} />}

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
