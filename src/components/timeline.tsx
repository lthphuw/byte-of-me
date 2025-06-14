"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export interface SubItem {
    title: string;
    message: string;
    avatarImg?: string;
    username?: string;
    icon?: React.ReactNode;
}

export interface TimelineItemProps {
    timeline: string | Date;
    title: string;
    message: string;
    avatarImg: string;
    username: string;
    icon?: React.ReactNode; // Custom icon prop
    subItems?: SubItem[]; // New prop for sub-items
    className?: string; // Optional className for customization
    style?: React.CSSProperties; // Optional inline styles
}

export function TimelineItem({
    timeline,
    title,
    message,
    avatarImg,
    username,
    icon,
    subItems = [], // Default to empty array if not provided
    className,
    style,
}: TimelineItemProps) {
    // Convert timeline to string if it's a Date
    const displayTimeline = typeof timeline === "string" ? timeline : timeline.toLocaleDateString();

    return (
        <>
            <div className="my-2 ps-2 first:mt-0">
                <h3 className="text-xs font-medium uppercase text-gray-500 dark:text-neutral-400">
                    {displayTimeline}
                </h3>
            </div>

            <div className={`flex gap-x-3 ${className}`} style={style}>
                <div className="relative after:absolute after:bottom-0 after:start-3.5 after:top-7 after:w-px after:-translate-x-[0.5px] after:bg-gray-200 last:after:hidden dark:after:bg-neutral-700">
                    <div className="relative z-10 flex size-7 items-center justify-center">
                        <div className="size-2 rounded-full bg-gray-400 dark:bg-neutral-600"></div>
                    </div>
                </div>
                <div className="grow pb-8 pt-0.5">
                    <h3 className="flex gap-x-1.5 font-semibold text-gray-800 dark:text-white">
                        {icon}
                        {title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-neutral-400">
                        {message}
                    </p>
                    {/* Main button */}
                    <button
                        type="button"
                        className="focus:outline-hidden -ms-1 mt-1 inline-flex items-center gap-x-2 rounded-lg border border-transparent p-1 text-xs text-gray-500 hover:bg-gray-100 focus:bg-gray-100 disabled:pointer-events-none disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:focus:bg-neutral-700"
                    >
                        <Image
                            src={avatarImg}
                            alt={`${username}'s avatar`}
                            width={16}
                            height={16}
                            className="size-4 shrink-0 rounded-full"
                        />
                        {username}
                    </button>
                    {/* Sub-items */}
                    {subItems.length > 0 && (
                        <div className="mt-4 space-y-2 border-l border-gray-200 pl-4 dark:border-neutral-700">
                            {subItems.map((subItem, index) => (
                                <div key={index} className="flex flex-col gap-1">
                                    <h4 className="text-sm font-medium text-gray-800 dark:text-white">
                                        {subItem.icon || null}
                                        {subItem.title}
                                    </h4>
                                    <p className="text-xs text-gray-600 dark:text-neutral-400">
                                        {subItem.message}
                                    </p>
                                    {subItem.avatarImg && subItem.username && (
                                        <button
                                            type="button"
                                            className="focus:outline-hidden -ms-1 inline-flex items-center gap-x-2 rounded-lg border border-transparent p-1 text-xs text-gray-500 hover:bg-gray-100 focus:bg-gray-100 disabled:pointer-events-none disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:focus:bg-neutral-700"
                                        >
                                            <Image
                                                src={subItem.avatarImg}
                                                alt={`${subItem.username}'s avatar`}
                                                width={16}
                                                height={16}
                                                className="size-4 shrink-0 rounded-full"
                                            />
                                            {subItem.username}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export function Timeline({ items }: { items: TimelineItemProps[] }) {
    return (
        <div className="px-4 py-10"> 
            <h2 className="mb-10 text-3xl font-bold">Timeline</h2>
            <div className="space-y-8">
                {items.map((item, index) => (
                    <TimelineItem
                        key={index}
                        timeline={item.timeline}
                        title={item.title}
                        message={item.message}
                        avatarImg={item.avatarImg}
                        username={item.username}
                        icon={item.icon}
                        subItems={item.subItems}
                        className={item.className}
                        style={item.style}
                    />
                ))}
            </div>
        </div>
    )
}