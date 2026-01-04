'use client';

import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { Variants, motion } from 'framer-motion';

import { cn } from '@/lib/utils';





export interface TechItem {
  id: string;
  name: string;
  logo: string;
}

export interface TechGroup {
  title: string;
  items: TechItem[];
}

export interface TechStackGroupProps {
  groups: TechGroup[];
  className?: string;
  style?: React.CSSProperties;
}

const groupVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
      delay: i * 0.08,
    },
  }),
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: (j: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: 'easeOut',
      delay: j * 0.04,
    },
  }),
};

export function TechStackGroup({
  groups,
  className,
  style,
}: TechStackGroupProps) {
  return (
    <div
      className={cn('grid grid-cols-1 md:grid-cols-2 gap-6', className)}
      style={style}
    >
      {groups.map((group, i) => (
        <motion.section
          key={group.title}
          custom={i}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          variants={groupVariants}
          className="h-full"
        >
          <div
            className={cn(
              'h-full rounded-xl border border-border/60',
              'bg-background/40 backdrop-blur',
              'p-5 md:p-6'
            )}
          >
            {/* Group title */}
            <h3 className="mb-4 text-sm md:text-base font-medium text-foreground/90">
              {group.title}
            </h3>

            {/* Items */}
            <div className="flex flex-wrap gap-3">
              {group.items.map((item, j) => (
                <motion.div
                  key={item.id}
                  custom={j}
                  variants={itemVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                >
                  <Link
                    href={`/projects?techstack=${item.id}`}
                    className={cn(
                      'group flex items-center gap-2',
                      'rounded-lg border border-border/50',
                      'bg-background/60 px-3 py-2',
                      'transition-colors duration-200',
                      'hover:border-foreground/40 hover:bg-accent/40'
                    )}
                  >
                    {/* Logo */}
                    <span className="relative h-5 w-5 shrink-0">
                      <Image
                        src={item.logo}
                        alt={item.name}
                        fill
                        className="object-contain"
                      />
                    </span>

                    {/* Name */}
                    <span
                      className={cn(
                        'text-xs md:text-sm',
                        'text-foreground/80 font-normal',
                        'group-hover:text-foreground'
                      )}
                    >
                      {item.name}
                    </span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      ))}
    </div>
  );
}
