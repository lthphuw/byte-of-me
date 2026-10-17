'use client';

import * as React from 'react';
import { Button } from '@byte-of-me/ui-primitives';
import { cn } from '@byte-of-me/ui-utils';
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from 'embla-carousel-react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import { useEmblaState } from './use-embla-state';

type CarouselApi = UseEmblaCarouselType[1];

type CarouselContextProps = {
  carouselRef: UseEmblaCarouselType[0];
  scrollPrev: () => void;
  scrollNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
};

const CarouselContext = React.createContext<CarouselContextProps | null>(null);

function useCarousel() {
  const context = React.useContext(CarouselContext);

  if (!context) {
    throw new Error('useCarousel must be used within a <Carousel />');
  }

  return context;
}

// Arrow keys inside a field, a video's controls or a handled event belong to
// that control, not to the carousel.
function ownsArrowKeys(event: React.KeyboardEvent): boolean {
  const target = event.target as HTMLElement;
  return (
    event.defaultPrevented ||
    target.isContentEditable ||
    /^(input|textarea|select|video|audio)$/i.test(target.tagName)
  );
}

const Carousel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    setApi?: (api: CarouselApi) => void;
  }
>(({ setApi, className, children, ...props }, ref) => {
  const [carouselRef, api] = useEmblaCarousel({ axis: 'x' });
  const { canScrollPrev, canScrollNext } = useEmblaState(api);

  const scrollPrev = React.useCallback(() => api?.scrollPrev(), [api]);
  const scrollNext = React.useCallback(() => api?.scrollNext(), [api]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (ownsArrowKeys(event)) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      scrollPrev();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      scrollNext();
    }
  };

  // `setApi` lives in a ref so a caller's inline function cannot re-announce
  // the same api on every render. Callers subscribe to it inside the callback,
  // and each repeat stacked another listener that was never removed.
  const setApiRef = React.useRef(setApi);
  React.useEffect(() => {
    setApiRef.current = setApi;
  });

  React.useEffect(() => {
    if (api) {
      setApiRef.current?.(api);
    }
  }, [api]);

  const context = React.useMemo(
    () => ({
      carouselRef,
      scrollPrev,
      scrollNext,
      canScrollPrev,
      canScrollNext,
    }),
    [carouselRef, scrollPrev, scrollNext, canScrollPrev, canScrollNext]
  );

  return (
    <CarouselContext.Provider value={context}>
      <div
        ref={ref}
        onKeyDownCapture={handleKeyDown}
        className={cn('relative', className)}
        role="region"
        aria-roledescription="carousel"
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  );
});
Carousel.displayName = 'Carousel';

const CarouselContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { carouselRef } = useCarousel();

  return (
    <div ref={carouselRef} className="overflow-hidden">
      <div
        ref={ref}
        // Embla only gets the swipe if the browser leaves the carousel's axis alone (`touch-action:
        // auto` lets the page claim a horizontal drag). Arbitrary property: `touch-pan-y` and
        // `touch-pinch-zoom` are one tailwind-merge group, so `cn` kept only the last.
        className={cn('flex -ml-4 [touch-action:pan-y_pinch-zoom]', className)}
        {...props}
      />
    </div>
  );
});
CarouselContent.displayName = 'CarouselContent';

const CarouselItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="group"
    aria-roledescription="slide"
    className={cn('min-w-0 shrink-0 grow-0 basis-full pl-4', className)}
    {...props}
  />
));
CarouselItem.displayName = 'CarouselItem';

type CarouselArrowProps = Omit<
  React.ComponentProps<typeof Button>,
  'children'
> & {
  /** The arrow's accessible name; this package has no i18n context. */
  label: string;
};

const CarouselPrevious = React.forwardRef<
  HTMLButtonElement,
  CarouselArrowProps
>(({ className, variant = 'outline', size = 'icon', label, ...props }, ref) => {
  const { scrollPrev, canScrollPrev } = useCarousel();

  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      className={cn(
        'absolute -left-12 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full',
        className
      )}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
    >
      <ArrowLeft />
      <span className="sr-only">{label}</span>
    </Button>
  );
});
CarouselPrevious.displayName = 'CarouselPrevious';

const CarouselNext = React.forwardRef<HTMLButtonElement, CarouselArrowProps>(
  ({ className, variant = 'outline', size = 'icon', label, ...props }, ref) => {
    const { scrollNext, canScrollNext } = useCarousel();

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn(
          'absolute -right-12 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full',
          className
        )}
        disabled={!canScrollNext}
        onClick={scrollNext}
        {...props}
      >
        <ArrowRight />
        <span className="sr-only">{label}</span>
      </Button>
    );
  }
);
CarouselNext.displayName = 'CarouselNext';

export {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
};
