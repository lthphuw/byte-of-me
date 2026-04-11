'use client';

import { useState } from 'react';
import { EducationItem } from '@/entities/education';
import { PublicEducation } from '@/entities/education/model/types';

import { EducationImageGallery } from './education-image-gallery';

export function EducationSection({
  educations,
}: {
  educations: PublicEducation[];
}) {
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
      <section className="space-y-8">
        {educations.map((edu) => (
          <EducationItem key={edu.id} edu={edu} onOpenGallery={openGallery} />
        ))}
      </section>

      <EducationImageGallery
        images={images}
        index={index}
        setIndex={setIndex}
        open={isOpen}
        onOpenChange={setIsOpen}
      />
    </>
  );
}
