import type { Transition } from 'framer-motion';

export const springTransition: Transition = {
  type: 'spring',
  stiffness: 150,
  damping: 15,
  duration: 0.3,
};

export const menuTransition: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
};
