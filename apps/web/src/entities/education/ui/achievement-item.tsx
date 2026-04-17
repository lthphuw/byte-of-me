'use client';

import { useState } from 'react';

import { AchievementImages } from './achievement-images';

import { ExpandableText } from '@/shared/ui/expandable-text';

export function AchievementItem({ achievement: a }: { achievement: Any }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const urls = a.images.map((i: Any) => i.url);

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
