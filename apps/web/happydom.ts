/**
 * Registers a happy-dom `Window` on `globalThis` so `*.spec.tsx` files can
 * render components with `@testing-library/react` under `bun test`.
 *
 * Loaded via `preload` in this app's `bunfig.toml`, *after* `./test-setup.ts` —
 * that one forces `DATABASE_URL` to an unreachable placeholder and must stay
 * first.
 */
import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register();

// React's `act` refuses to run (and warns once per call) unless the environment
// says it is a test one. Testing Library does not set it under `bun test`.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
