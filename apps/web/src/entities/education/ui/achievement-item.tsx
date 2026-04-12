'use client';

import { useState } from 'react';

import { ExpandableText } from '@/shared/ui/expandable-text';

import { AchievementImages } from './achievement-images';

export function AchievementItem({
  achievement: a,
  onOpenGallery,
}: {
  achievement: any;
  onOpenGallery: (imgs: string[], i: number) => void;
}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const urls = a.images.map((i: any) => i.url);

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
        onOpenGallery={onOpenGallery}
      />
    </div>
  );
}
