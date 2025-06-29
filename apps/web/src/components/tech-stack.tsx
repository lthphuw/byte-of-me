'use client';

import Image from 'next/image';
import { Variants, motion } from 'framer-motion';

export interface TechItem {
  name: string;
  logo: string; // image src
}

export interface TechGroup {
  title: string;
  items: TechItem[];
}

export interface TechStackProps {
  groups: TechGroup[];
  className?: string;
  style?: React.CSSProperties;
}

export function TechStack({ groups, className, style }: TechStackProps) {
  const groupVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.4, 0, 0.2, 1],
        delay: i * 0.1,
      },
    }),
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: (j: number) => ({
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1],
        delay: j * 0.05,
      },
    }),
  };

  return (
    <div
      className={`w-full mx-auto grid gap-6 grid-cols-1 md:grid-cols-2 ${className}`}
      style={style}
    >
      {groups.map((group, i) => (
        <motion.div
          key={i}
          custom={i}
          initial="hidden"
          whileInView="visible"
          variants={groupVariants}
          viewport={{ once: true, amount: 0.2 }}
          className="h-full"
        >
          <div className="container-bg p-5 h-full rounded-2xl shadow-xl dark:shadow-[0_4px_12px_rgba(255,255,255,0.04)]">
            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-semibold md:text-xl">
                {group.title}
              </h3>
              <div className=" grid grid-cols-2 md:flex md:flex-wrap md:gap-4 justify-start">
                {group.items.map((item, j) => (
                  <motion.div
                    key={j}
                    custom={j}
                    initial="hidden"
                    whileInView="visible"
                    variants={itemVariants}
                    viewport={{ once: true }}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    className="flex flex-col items-center cursor-pointer px-1 py-2 w-[100px] group rounded-md"
                  >
                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 mb-2">
                      <Image
                        src={item.logo}
                        alt={item.name}
                        fill
                        className="object-contain transition-transform duration-300"
                      />
                    </div>
                    <span className="text-xs sm:text-sm text-center text-gray-700 dark:text-gray-300 font-medium">
                      {item.name}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
