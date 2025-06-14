"use client"

import { useTheme } from "next-themes"
import {
  useFloating,
  offset,
  flip,
  shift,
  useClick,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
  autoUpdate,
  autoPlacement,
} from "@floating-ui/react"
import { useState } from "react"
import { motion, AnimatePresence, Variants } from "framer-motion"

import { Icons } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { LiquidGlass } from "./liquid-glass"

export interface ModeToggleProps {
  liquidGlassDisabled?: boolean
}

export function ModeToggle({ liquidGlassDisabled }: ModeToggleProps) {
  const { setTheme } = useTheme()
  const [open, setOpen] = useState(false)

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    strategy: "absolute",
    placement: "bottom-end",
    middleware: [offset(4),],
    whileElementsMounted: autoUpdate,
  })

  const click = useClick(context)
  const dismiss = useDismiss(context)
  const role = useRole(context)
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ])

  // Variants cho animation của từng item
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        type: "spring",
        stiffness: 260,
        damping: 20,
      },
    }),
    exit: { opacity: 0, y: 10 },
  }

  return (
    <motion.div layout style={{ position: "relative" }}>
      <LiquidGlass
        variant="button-icon"
        intensity="medium"
        rippleEffect
        flowOnHover
        stretchOnDrag
        disabled={liquidGlassDisabled}
        className="bg-transparent"
      >
        <Button
          ref={refs.setReference}
          {...getReferenceProps()}
          variant="icon"
          size="sm"
          className="relative size-9 px-0 focus:outline-none"
        >
          <Icons.sun className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Icons.moon className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </LiquidGlass>

      <FloatingPortal>
        <AnimatePresence>
          {open && (
            <div
              ref={refs.setFloating}
              style={{
                ...floatingStyles,
                zIndex: 1000,
                position: "absolute",
              }}
              {...getFloatingProps()}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <LiquidGlass
                  variant="panel"
                  intensity="medium"
                  rippleEffect
                  flowOnHover
                  stretchOnDrag={false}
                  className="mt-0 min-w-[140px] rounded-md p-1 text-sm shadow-xl"
                >
                  {[
                    { theme: "light", icon: Icons.sun, label: "Light" },
                    { theme: "dark", icon: Icons.moon, label: "Dark" },
                    { theme: "system", icon: Icons.laptop, label: "System" },
                  ].map((item, index) => (
                    <motion.div
                      key={item.theme}
                      custom={index}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      onClick={() => setTheme(item.theme)}
                      className="flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 hover:bg-accent"
                    >
                      <item.icon className="mr-2 size-4" />
                      <span>{item.label}</span>
                    </motion.div>
                  ))}
                </LiquidGlass>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </FloatingPortal>
    </motion.div>
  )
}