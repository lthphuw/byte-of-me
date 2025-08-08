import { useEffect } from 'react';





type EventListener = (event: Event) => void;

export function useEventListener(
  event: keyof WindowEventMap,
  listener: EventListener,
  useCapture?: boolean
) {
  useEffect(() => {
    if (typeof listener !== 'function') {
      return;
    }

    window.addEventListener(event, listener, useCapture);

    return () => {
      window.removeEventListener(event, listener, useCapture);
    };
  }, [event, listener, useCapture]);
}
