"use client"

import { globalConfig } from "@/config/global"
import { useCompactHeader } from "@/hooks/use-compact-header"
import { useElementDimensions } from "@/hooks/use-element-dimension"
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
    const { dimensions: headerDimensions, ref: headerRef } = useElementDimensions<HTMLDivElement>()
    const { width: headerWidth } = headerDimensions ?? {}

    // Thêm hook để đo width của div chứa ModeToggle và I18NToggle
    // const { dimensions: toggleDimensions, ref: toggleRef } = useElementDimensions<HTMLDivElement>()
    // const { width: toggleWidth } = toggleDimensions ?? {}

    const { resolvedTheme: theme } = useTheme()
    // const [controllerWidth, setControllerWidth] = React.useState<number>(0)
    const {
        isCompact,
        animationControls,
        transitionConfig,
        constants: {
            COMPACT_X_OFFSET,
            COMPACT_BORDER_RADIUS,
            COMPACT_TOP_OFFSET,
            COMPACT_PADDING,
            DEFAULT_PADDING,
            COMPACT_HEIGHT,
            DEFAULT_HEIGHT,
            COMPACT_WIDTH_OFFSET,
        },
    } = useCompactHeader(scrollY, headerWidth)

    const themeStyles = cn(
        theme === "dark"
            ? "shadow-[0_4px_20px_rgba(255,255,255,0.08)]"
            : "shadow-md",
        isCompact && theme !== "dark" && "shadow-xl"
    )

    // React.useEffect(() => {
    //     if (toggleWidth) {
    //         setControllerWidth((toggleWidth ?? 0) + 32)
    //     }
    // }, [headerWidth])

    return (
        <>
            {/* Main Header */}
            <motion.header
                initial={false}
                className={cn(
                    "fixed left-0 top-0 z-50 w-full",
                    themeStyles,
                    isCompact && "mr-auto pl-0",
                )}
                animate={animationControls}
            >
                <LiquidGlass
                    variant="panel"
                    intensity="strong"
                    rippleEffect={isCompact}
                    flowOnHover={isCompact}
                    stretchOnDrag={false}
                    className="relative flex flex-row items-center"
                    disabled={!isCompact}
                >
                    <motion.div
                        className={cn(
                            "flex w-fit items-center justify-between rounded-2xl",
                            isCompact ? "py-1 px-2 md:py-3 md:px-4 " : `${DEFAULT_PADDING} md:ml-12`
                        )}
                        animate={{
                            height: isCompact ? COMPACT_HEIGHT : DEFAULT_HEIGHT,
                            padding: isCompact ? COMPACT_PADDING : DEFAULT_PADDING,
                        }}
                        transition={transitionConfig}
                        ref={headerRef}
                    >
                        <MainNav items={globalConfig.header.nav} minimized={isCompact} />
                    </motion.div>
                </LiquidGlass>
            </motion.header>

            {/* Toggle Controls */}
            <motion.div
                className={cn(
                    `fixed top-0 right-12 z-50 space-x-2`,
                    isCompact && "ml-auto",
                )}
                animate={{
                    left: "auto",
                    right: isCompact ? COMPACT_X_OFFSET : 0,
                    top: isCompact ? COMPACT_TOP_OFFSET : 0,
                    borderRadius: isCompact ? COMPACT_BORDER_RADIUS : 0,
                    transition: { ease: ["easeOut"] }
                }}
                transition={transitionConfig}
            >
                <LiquidGlass
                    variant="panel"
                    intensity="strong"
                    rippleEffect={isCompact}
                    flowOnHover={isCompact}
                    stretchOnDrag={false}
                    className="relative flex flex-row items-center"
                    disabled={!isCompact}
                >
                    <motion.div
                        className={cn(
                            "flex items-center gap-2 rounded-2xl justify-end",
                            themeStyles,
                            isCompact ? "py-1 px-2 md:py-3 md:px-4" : `px-4`
                        )}
                        animate={{
                            // justifyContent: isCompact ? "center" : "end",
                            // width: isCompact ? controllerWidth : (controllerWidth + 64),
                            height: isCompact ? COMPACT_HEIGHT : DEFAULT_HEIGHT,
                            borderRadius: isCompact ? COMPACT_BORDER_RADIUS : 0,
                        }}
                        transition={transitionConfig}
                    >
                        <div
                            className="flex items-center gap-2"
                        // ref={toggleRef}
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
                        </div>
                    </motion.div>
                </LiquidGlass>
            </motion.div>
        </>
    )
}