//  Original code from: https://github.com/mantinedev/mantine/blob/master/packages/%40mantine/hooks/src/use-id/use-react-id.ts
import React from 'react';

const __useId: () => string | undefined =
  (React as any)['useId'.toString()] || (() => undefined);

export function useReactId() {
  const id = __useId();
  return id ? `byte-of-me-${id.replace(/:/g, '')}` : '';
}
