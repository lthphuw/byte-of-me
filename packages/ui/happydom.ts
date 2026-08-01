/**
 * Registers a happy-dom `Window` on `globalThis` so `*.spec.tsx` files can
 * render components with `@testing-library/react` under `bun test`.
 *
 * Loaded via `preload` in this package's `bunfig.toml`.
 */
import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register();

