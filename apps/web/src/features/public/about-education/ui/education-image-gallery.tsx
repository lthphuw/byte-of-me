'use client';

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect } from 'react';

import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent } from '@/shared/ui/dialog';

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
      <DialogContent className="h-[100dvh] w-screen max-w-none border-none bg-black p-0">
        {/* Close */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 z-30 text-white"
          onClick={() => onOpenChange(false)}
        >
          <X />
        </Button>

        {/* Image */}
        {images[index] && (
          <div className="relative h-full w-full">
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
