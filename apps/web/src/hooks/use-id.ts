//  Original code from: https://github.com/mantinedev/mantine/blob/master/packages/%40mantine/hooks/src/use-id/use-id.ts
import { useState } from 'react';

import { useIsomorphicEffect } from './use-isomorphic-effect';
import { useReactId } from './use-react-id';
import { randomId } from './utils';

export function useId(staticId?: string) {
  const reactId = useReactId();
  const [uuid, setUuid] = useState(reactId);

  useIsomorphicEffect(() => {
    setUuid(randomId());
  }, []);

  if (typeof staticId === 'string') {
    return staticId;
  }

  if (typeof window === 'undefined') {
    return reactId;
  }

  return uuid;
}
