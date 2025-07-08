// Original code from: https://github.com/mantinedev/mantine/blob/master/packages/%40mantine/hooks/src/use-isomorphic-effect/use-isomorphic-effect.ts
import { useEffect, useLayoutEffect } from 'react';

// UseLayoutEffect will show warning if used during ssr, e.g. with Next.js
// UseIsomorphicEffect removes it by replacing useLayoutEffect with useEffect during ssr
export const useIsomorphicEffect =
  typeof document !== 'undefined' ? useLayoutEffect : useEffect;
