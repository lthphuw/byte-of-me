"use client"

import { globalConfig } from "@/config/global"
import { useElementDimensions } from "@/hooks/use-element-dimension"
import { useCompactHeader } from "@/hooks/use-compact-header"
import { cn } from "@/lib/utils"
import { useWindowScroll } from "@uidotdev/usehooks"
import { motion } from "framer-motion"
import { useTheme } from "next-themes"

import { I18NToggle } from "./i18n-toggle"
import { LiquidGlass } from "./liquid-glass"
import { MainNav } from "./main-nav"
import { ModeToggle } from "./mode-toggle"

const controlVariants = {
    compact: {
        scale: 0.9,
        opacity: 0.95,
    },
    default: {
        scale: 1,
        opacity: 1,
    },
}

export function SiteHeader() {
    const [{ y: scrollY }] = useWindowScroll()
    const { dimensions, ref } = useElementDimensions<HTMLDivElement>()
    const { width } = dimensions ?? {}
    const { resolvedTheme: theme } = useTheme()

    const {
        isCompact,
        animationControls,
        transitionConfig,
        constants: {
            COMPACT_OFFSET,
            COMPACT_PADDING,
            DEFAULT_PADDING,
            COMPACT_HEIGHT,
            DEFAULT_HEIGHT,
        },
    } = useCompactHeader(scrollY, width)

    const themeStyles = cn(
        theme === "dark"
            ? "bg-[rgba(var(--background-rgb),0.8)] shadow-[0_4px_20px_rgba(255,255,255,0.08)]"
            : "bg-[rgba(var(--background-rgb),0.8)] shadow-md",
        isCompact && theme !== "dark" && "shadow-xl"
    )

    return (
        <>
            {/* Main Header */}
            <motion.header
                className={cn(
                    "fixed left-0 top-0 z-40 w-full pl-6 md:pl-0",
                    themeStyles,
                    isCompact && "mr-auto pl-0 md:left-6"
                )}
                animate={animationControls}
            >
                <LiquidGlass
                    variant="panel"
                    intensity="medium"
                    rippleEffect={isCompact}
                    flowOnHover={isCompact}
                    stretchOnDrag={false}
                    className="relative flex flex-row items-center"
                    disabled={!isCompact}
                >
                    <motion.div
                        className={cn(
                            "flex w-fit items-center justify-between rounded-2xl",
                            isCompact ? COMPACT_PADDING : DEFAULT_PADDING
                        )}
                        animate={{
                            height: isCompact ? COMPACT_HEIGHT : DEFAULT_HEIGHT,
                            padding: isCompact ? COMPACT_PADDING : DEFAULT_PADDING,
                        }}
                        transition={transitionConfig}
                        ref={ref}
                    >
                        <MainNav items={globalConfig.header.nav} minimized={isCompact} />
                    </motion.div>
                </LiquidGlass>
            </motion.header>

            {/* Toggle Controls */}
            <motion.div
                className={cn(
                    "fixed right-4 top-0 z-50 space-x-2 md:right-6",
                    isCompact && "mr-auto"
                )}
                animate={{
                    top: isCompact ? COMPACT_OFFSET : 0,
                    borderRadius: isCompact ? COMPACT_OFFSET : 0,
                }}
                transition={transitionConfig}
            >
                <LiquidGlass
                    variant="panel"
                    intensity="medium"
                    rippleEffect={isCompact}
                    flowOnHover={isCompact}
                    stretchOnDrag={false}
                    className="relative flex flex-row items-center"
                    disabled={!isCompact}
                >
                    <motion.div
                        className={cn(
                            "flex items-center justify-center gap-2 rounded-2xl",
                            themeStyles,
                            isCompact ? COMPACT_PADDING : DEFAULT_PADDING
                        )}
                        animate={{
                            height: isCompact ? COMPACT_HEIGHT : DEFAULT_HEIGHT,
                            padding: isCompact ? COMPACT_PADDING : DEFAULT_PADDING,
                            borderRadius: isCompact ? COMPACT_OFFSET : 0,
                        }}
                        transition={transitionConfig}
                    >
                        <motion.div
                            variants={controlVariants}
                            animate={isCompact ? "compact" : "default"}
                            transition={transitionConfig}
                        >
                            <ModeToggle liquidGlassDisabled={!isCompact} />
                        </motion.div>
                        <motion.div
                            variants={controlVariants}
                            animate={isCompact ? "compact" : "default"}
                            transition={transitionConfig}
                        >
                            <I18NToggle liquidGlassDisabled={!isCompact} />
                        </motion.div>
                    </motion.div>
                </LiquidGlass>
            </motion.div>
        </>
    )
}
