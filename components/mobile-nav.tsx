"use client"

import { AnimatePresence, motion } from "framer-motion"
import Link from "next/link"
import * as React from "react"

import { Icons } from "@/components/icons"
import { siteConfig } from "@/config/site"
import { useLockBody } from "@/hooks/use-lock-body"
import { cn } from "@/lib/utils"
import { MainNavItem } from "types"
import { LiquidGlass } from "./liquid-glass"

// Constants for positioning offsets
const TOP_OFFSET = 100 // pixels
const SIDE_OFFSET = 16 // pixels

// Define the props interface including motion.div props
interface MobileNavProps extends React.ComponentProps<typeof motion.div> {
  /** Whether the mobile navigation is open */
  isOpen?: boolean
  /** Callback to update the open state */
  onOpenChange?: (open: boolean) => void
  /** The origin position for the animation transform */
  originPosition: { x: number; y: number }
  /** Navigation items to display */
  items: MainNavItem[]
  /** Additional content to render */
  children?: React.ReactNode
}

// Animation variants for the container
const containerVariants = {
  hidden: {
    opacity: 0,
    scale: 0.3,
    transition: { duration: 0.3, ease: "easeIn", delay: 0.1 },
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      duration: 0.3,
      ease: "easeOut",
      when: "beforeChildren",
      delayChildren: 0.1,
      staggerChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    scale: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
}

// Animation variants for individual items
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
}

/**
 * A mobile navigation component that slides in with animation and locks body scroll.
 * @component
 */
export const MobileNav = React.forwardRef<HTMLDivElement, MobileNavProps>(
  (
    { items, children, isOpen, onOpenChange = () => { }, originPosition, className, style, ...motionProps },
    ref
  ) => {
    useLockBody(isOpen)

    // Calculate transform origin for animation
    const transformOrigin = `${originPosition.x}px ${originPosition.y}px`

    // Apply offset to prevent overlapping the reference element
    const positionOffset = {
      top: `calc(${style?.top || "0px"} + ${TOP_OFFSET}px)`,
      left: `calc(${style?.left || "0px"} + ${SIDE_OFFSET}px)`,
      right: `${SIDE_OFFSET}px`,
    }

    // Callback to close the menu
    const handleClose = React.useCallback(() => {
      onOpenChange(false)
    }, [onOpenChange])

    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={ref}
            className={cn(
              "fixed z-50 grid grid-flow-row auto-rows-max overflow-auto rounded-2xl shadow-md md:hidden",
              className
            )}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{ ...style, ...positionOffset, transformOrigin }}
            {...motionProps}
          >
            <LiquidGlass
              variant="panel"
              intensity="medium"
              rippleEffect={true}
              flowOnHover={true}
              stretchOnDrag={false}
            >
              <motion.div
                className="relative z-20 grid gap-6 bg-transparent p-4 text-popover-foreground"
                variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
              >
                <Link href="/" onClick={handleClose} className="flex items-center space-x-2">
                  <motion.div key="logo" initial="hidden" animate="visible" exit="hidden">
                    <Icons.logo className="size-6" />
                  </motion.div>
                  <span className="font-bold">{siteConfig.name}</span>
                </Link>

                <nav className="grid grid-flow-row auto-rows-max text-sm">
                  {items.map((item, index) => (
                    <motion.div key={index} variants={itemVariants}>
                      <Link
                        href={item.disabled ? "#" : item.href}
                        onClick={handleClose}
                        className={cn(
                          "flex w-full items-center rounded-md p-2 text-sm font-medium hover:underline",
                          item.disabled && "cursor-not-allowed opacity-60"
                        )}
                      >
                        {item.title}
                      </Link>
                    </motion.div>
                  ))}
                </nav>

                {children}
              </motion.div>
            </LiquidGlass>
          </motion.div>
        )}
      </AnimatePresence>
    )
  }
)

MobileNav.displayName = "MobileNav"