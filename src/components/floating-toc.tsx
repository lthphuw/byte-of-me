"use client";

import { useTranslations } from "@/hooks/use-translations";
import {
    autoUpdate,
    flip,
    offset,
    shift,
    useClick,
    useDismiss,
    useFloating,
    useInteractions,
} from "@floating-ui/react";
import { AnimatePresence, motion, Variants } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { Icons } from "./icons";
import { LiquidGlass } from "./liquid-glass";

interface TocItem {
    href: string;
    label: string;
}

interface FloatingTocProps {
    items: TocItem[];
}

export function FloatingToc({ items }: FloatingTocProps) {
    const t = useTranslations("global");
    const [open, setOpen] = useState(false);
    const { refs, floatingStyles, context } = useFloating({
        open,
        onOpenChange: setOpen,
        strategy: "absolute",
        middleware: [offset(12), flip(), shift()],
        placement: "left",
        whileElementsMounted: autoUpdate,
    });

    const click = useClick(context);
    const dismiss = useDismiss(context);
    const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss]);

    // Animation variants for the TOC panel
    const panelVariants: Variants = {
        hidden: { opacity: 0, x: 30 },
        visible: {
            opacity: 1,
            x: 0,
            transition: {
                duration: 0.4,
                ease: [0.4, 0, 0.2, 1],
            },
        },
        exit: {
            opacity: 0,
            x: 30,
            transition: {
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1],
            },
        },
    };

    return (
        <>
            {/* Docked button */}
            <div
                ref={refs.setReference}
                {...getReferenceProps()}
                className="fixed right-4 md:right-12 top-1/3 z-60 flex flex-col items-center cursor-pointer"
            >
                <LiquidGlass
                    variant="button"
                    intensity="medium"
                    // rippleEffect={false}
                    disableRipple
                    // flowOnHover
                    disableStretch
                    disableJiggle
                >
                    <div className="bg-transparent flex flex-col justify-center items-center px-1.5 py-2 md:px-2 md:py-3">
                        {items.map((item, index) => (
                            <a
                                key={index}
                                href={item.href}
                                className="my-1.5 w-6 h-6 flex items-center justify-center text-sm hover:text-blue-600 transition-colors duration-200"
                            >
                                -
                            </a>
                        ))}
                        <Icons.toc className="mt-2 w-5 h-5 text-gray-500" />
                    </div>
                </LiquidGlass>
            </div>

            {/* Full TOC popup */}
            <AnimatePresence>
                {open && (
                    <div
                        ref={refs.setFloating}
                        style={floatingStyles}
                        {...getFloatingProps()}
                        className="z-50 !m-0"
                    >
                        <motion.div
                            variants={panelVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                        >
                            <LiquidGlass
                                variant="panel"
                                intensity="strong"
                                disableStretch
                                className="overflow-hidden rounded-lg"
                            >
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
                                    className="w-72 max-h-[80vh] overflow-y-auto px-4 py-5"
                                >
                                    <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900 dark:text-gray-100 mb-4">
                                        {t("Table of Content")}
                                    </h3>
                                    <ul className="space-y-3 text-sm">
                                        {items.map((item, i) => (
                                            <li key={i}>
                                                <Link
                                                    href={item.href}
                                                    className="block text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
                                                >
                                                    {item.label}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </motion.div>
                            </LiquidGlass>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}