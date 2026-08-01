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
