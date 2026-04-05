'use client';

import { useState } from 'react';
import { Education } from '@/models/education';

import { EducationItem } from './education-item';
import { ImageGallery } from './image-gallery';

export function EducationSection({ educations }: { educations: Education[] }) {
  const [images, setImages] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const openGallery = (imgs: string[], i: number) => {
    setImages(imgs);
    setIndex(i);
    setIsOpen(true);
  };

  return (
    <>
      <div className="space-y-8">
        {educations.map((edu) => (
          <EducationItem key={edu.id} edu={edu} onOpenGallery={openGallery} />
        ))}
      </div>

      <ImageGallery
        images={images}
        index={index}
        setIndex={setIndex}
        open={isOpen}
        onOpenChange={setIsOpen}
      />
    </>
  );
}
