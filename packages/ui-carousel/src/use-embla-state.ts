'use client';

import { useEffect, useState } from 'react';
import type { UseEmblaCarouselType } from 'embla-carousel-react';

type EmblaApi = UseEmblaCarouselType[1];

interface EmblaState {
  selectedIndex: number;
  canScrollPrev: boolean;
  canScrollNext: boolean;
}

const INITIAL: EmblaState = {
  selectedIndex: 0,
  canScrollPrev: false,
  canScrollNext: false,
};

/** The selected slide and the two scroll limits of an Embla api, kept current. */
export function useEmblaState(api: EmblaApi): EmblaState {
  const [state, setState] = useState(INITIAL);

  useEffect(() => {
    if (!api) return;

    const read = () => {
      const next = {
        selectedIndex: api.selectedScrollSnap(),
        canScrollPrev: api.canScrollPrev(),
        canScrollNext: api.canScrollNext(),
      };
      setState((prev) =>
        prev.selectedIndex === next.selectedIndex &&
        prev.canScrollPrev === next.canScrollPrev &&
        prev.canScrollNext === next.canScrollNext
          ? prev
          : next
      );
    };

    read();
    api.on('select', read);
    api.on('reInit', read);
    return () => {
      api.off('select', read);
      api.off('reInit', read);
    };
  }, [api]);

  return state;
}
