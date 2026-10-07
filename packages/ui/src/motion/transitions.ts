import type { Transition } from 'framer-motion';

// No `duration`: with stiffness/damping set it is ignored, and it read as if
// it capped the spring.
export const springTransition: Transition = {
  type: 'spring',
  stiffness: 150,
  damping: 15,
};

export const menuTransition: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
};
