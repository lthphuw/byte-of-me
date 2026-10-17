import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register();

// React's `act` warns on every call unless the environment says it is a test one.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
