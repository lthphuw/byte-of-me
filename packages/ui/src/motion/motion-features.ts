// Lazily-loaded animation feature bundle for <LazyMotion>. Kept in its own
// module so bundlers can code-split it out of the initial JS — the provider
// imports it dynamically. `domMax` (not `domAnimation`) is required because the
// public header logo swaps its label through `<AnimatePresence mode="popLayout">`,
// which needs the projection system.
import { domMax } from 'framer-motion';

export default domMax;
