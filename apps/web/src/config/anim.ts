import { Variants } from 'framer-motion';

// Items dropdown / select / ...
export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      type: 'spring' as const,
      stiffness: 130,
      damping: 10,
    },
  }),
  exit: { opacity: 0, y: 10 },
};

// Icon - open / close
export const iconVariants: Variants = {
  open: {
    rotate: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 100, damping: 10, mass: 0.5 },
  },
  closed: {
    rotate: 90,
    scale: 0,
    transition: { type: 'spring', stiffness: 100, damping: 10, mass: 0.5 },
  },
};
