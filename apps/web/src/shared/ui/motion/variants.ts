import type { Variants } from 'framer-motion';

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

// Define icon animation switch variants
export const iconSwitchVariants = {
  initial: { opacity: 0, scale: 0.8, rotate: 90 },
  animate: { opacity: 1, scale: 1, rotate: 0 },
  exit: { opacity: 0, scale: 0.8, rotate: -90 },
};

export const menuVariants: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 4 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: -4 },
};
