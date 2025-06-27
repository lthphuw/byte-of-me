'use client';

import { ReactNode } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

export interface SubItem {
  title: ReactNode;
  message: ReactNode;
  avatarImg?: string;
  username?: string;
  icon?: ReactNode;
}

export interface TimelineItemProps {
  timeline: string | Date;
  title: ReactNode;
  message: ReactNode;
  avatarImg?: string;
  username?: string;
  icon?: ReactNode;
  subItems?: SubItem[];
  className?: string;
  style?: React.CSSProperties;
}

export interface TimelineProps {
  title?: string;
  items: TimelineItemProps[];
  className?: string;
  style?: React.CSSProperties;
}
export function TimelineItem({
  timeline,
  title,
  message,
  avatarImg,
  username,
  icon,
  subItems = [],
  className,
  style,
}: TimelineItemProps) {
  const displayTimeline =
    typeof timeline === 'string' ? timeline : timeline.toLocaleDateString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="my-1 first:mt-0">
        <h3 className="text-base md:text-lg font-medium uppercase">
          {displayTimeline}
        </h3>
      </div>

      <div className={`flex gap-x-2 ${className}`} style={style}>
        <div className="relative after:absolute after:bottom-0 after:start-3.5 after:top-6 after:w-px after:-translate-x-[0.5px] after:bg-gray-200 last:after:hidden dark:after:bg-neutral-700">
          <div className="relative z-10 flex size-6 items-center justify-center">
            <div className="size-2 rounded-full bg-blue-500 dark:bg-blue-400"></div>
          </div>
        </div>

        <div className="grow pb-4 pt-0.5">
          <h3 className="flex items-start md:items-center gap-x-2 text-base md:text-lg font-semibold">
            {icon}
            <span>{title}</span>
          </h3>
          <div className="mt-1 text-xs md:text-sm italic">{message}</div>

          {avatarImg && (
            <button
              type="button"
              className="-ms-1 mt-1 inline-flex items-center gap-x-1.5 rounded-lg border border-transparent p-0.5 text-xs md:text-sm hover:bg-gray-100 focus:bg-gray-100 dark:hover:bg-neutral-700 dark:focus:bg-neutral-700"
            >
              <Image
                src={avatarImg}
                alt={`${username}'s avatar`}
                width={16}
                height={16}
                className="size-4 rounded-full"
              />
              {username}
            </button>
          )}

          {subItems.length > 0 && (
            <div className="flex flex-col gap-4 mt-2 space-y-1 border-l-2 border-blue-200 pl-3 dark:border-blue-800">
              {subItems.map((subItem, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 * index }}
                  viewport={{ once: true }}
                  className="flex flex-col gap-0.5"
                >
                  <h4 className="text-sm md:text-base font-medium">
                    {subItem.icon || null}
                    {subItem.title}
                  </h4>
                  <div className="text-xs md:text-sm">{subItem.message}</div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function Timeline({ title, items, className, style }: TimelineProps) {
  return (
    <div className={`flex flex-col gap-3 ${className}`} style={style}>
      {title && <h2 className="text-xl md:text-2xl font-bold">{title}</h2>}
      <div className="space-y-4">
        {items.map((item, index) => (
          <TimelineItem key={index} {...item} />
        ))}
      </div>
    </div>
  );
}
