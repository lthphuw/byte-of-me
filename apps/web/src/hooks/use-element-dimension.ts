import { useLayoutEffect, useRef, useState } from 'react';

interface Dimensions {
  width: number;
  height: number;
}

export function useElementDimensions<T extends HTMLElement>(): {
  ref: React.RefObject<T | null>;
  dimensions: Dimensions | undefined;
} {
  const ref = useRef<T>(null);
  const [dimensions, setDimensions] = useState<Dimensions | undefined>(
    undefined
  );

  useLayoutEffect(() => {
    if (!ref.current) {
      return;
    }

    const element = ref.current;

    // Debounced dimension update
    let timeout: NodeJS.Timeout;
    const updateDimensions = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setDimensions({
          width: element.offsetWidth,
          height: element.offsetHeight,
        });
      }, 100); // 100ms debounce
    };

    // Initial measurement
    updateDimensions();

    // Observe resize
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(element);

    // Cleanup
    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, []);

  return { ref, dimensions };
}
