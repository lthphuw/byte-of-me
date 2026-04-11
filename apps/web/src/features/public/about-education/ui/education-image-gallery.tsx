'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export function EducationImageGallery({
  images,
  index,
  setIndex,
  open,
  onOpenChange,
}: any) {
  const prev = () =>
    setIndex((i: number) => (i === 0 ? images.length - 1 : i - 1));

  const next = () =>
    setIndex((i: number) => (i === images.length - 1 ? 0 : i + 1));

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-screen h-[100dvh] max-w-none p-0 bg-black border-none">
        {/* Close */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-30 text-white"
          onClick={() => onOpenChange(false)}
        >
          <X />
        </Button>

        {/* Image */}
        {images[index] && (
          <div className="relative w-full h-full">
            <Image src={images[index]} alt="" fill className="object-contain" />
          </div>
        )}

        {/* Nav */}
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-4 top-1/2 text-white"
            >
              <ChevronLeft />
            </button>
            <button
              onClick={next}
              className="absolute right-4 top-1/2 text-white"
            >
              <ChevronRight />
            </button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
