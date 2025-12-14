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
  icon?: string;
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
    typeof timeline === 'string'
      ? timeline
      : timeline.toLocaleDateString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="my-2 first:mt-0">
        <h3 className="text-sm md:text-base font-semibold uppercase tracking-wide text-muted-foreground">
          {displayTimeline}
        </h3>
      </div>

      <div className={`flex gap-x-4 ${className}`} style={style}>
        {/* Timeline rail */}
        <div className="relative flex flex-col items-center">
          <motion.span
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="absolute top-6 bottom-0 rounded-3xl w-[2px] origin-top bg-border/70 last:hidden"
          />

          {/* Dot */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative z-10 flex size-6 items-center justify-center"
          >
            <div className="size-2.5 rounded-full bg-foreground/80" />
          </motion.div>
        </div>

        {/* Content */}
        <div className="grow pb-6 pt-0.5">
          <h3 className="flex items-start md:items-center gap-x-2">
            {
              icon && <Image
              src={icon}
              alt="icon"
              className="object-center object-contain rounded-full"
              width={32}
              height={32} />}
            <span className="text-base md:text-lg font-semibold tracking-tight">
              {title}
            </span>
          </h3>

          {message && (
            <p className="mt-1 text-sm md:text-base italic text-muted-foreground">
              {message}
            </p>
          )}

          {avatarImg && (
            <button
              type="button"
              className="mt-2 inline-flex items-center gap-x-2 rounded-md
                border border-border px-2 py-1 text-xs md:text-sm
                text-muted-foreground transition-colors
                hover:bg-accent hover:text-foreground"
            >
              <Image
                src={avatarImg}
                alt={`${username}'s avatar`}
                width={18}
                height={18}
                className="size-4 object-center object-contain rounded-full"
              />
              <span className="font-medium">{username}</span>
            </button>
          )}

          {subItems.length > 0 && (
            <div className="mt-4 space-y-3 border-l-[1.5px] border-border/60 pl-4">
              {subItems.map((subItem, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.3,
                    ease: 'easeOut',
                    delay: index * 0.05,
                  }}
                  className="flex flex-col gap-0.5"
                >
                  <h4 className="text-sm md:text-base font-medium flex items-center gap-x-1">
                    {subItem.icon}
                    {subItem.title}
                  </h4>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    {subItem.message}
                  </p>
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
