"use client"

import { useFloating, offset, flip, shift, useClick, useDismiss, useRole, useInteractions, FloatingPortal, autoUpdate } from "@floating-ui/react"
import { AnimatePresence, motion, Variants } from "framer-motion"
import { useCallback, useState } from "react"

import { Button } from "@/components/ui/button"
import { Flags, FlagType } from "./flag"
import { LiquidGlass } from "./liquid-glass"

export interface I18NToggleProps {
  liquidGlassDisabled?: boolean
}

export function I18NToggle({ liquidGlassDisabled }: I18NToggleProps) {
  const [lang, setLang] = useState<FlagType>("en")
  const FlagComponent = Flags[lang]
  const [open, setOpen] = useState(false)

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    strategy: "absolute",
    placement: "bottom-end",
    middleware: [offset(8), flip(), shift()],
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

  const changeLanguage = useCallback((lang: FlagType) => {
    setLang(lang)
    // router.push(`/vi/path`, undefined, { locale: lang })
  }, [])

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
          <AnimatePresence mode="wait">
            {FlagComponent && (
              <motion.span
                key={lang}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <FlagComponent className="size-5" />
              </motion.span>
            )}
          </AnimatePresence>
          <span className="sr-only">Toggle language</span>
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
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
              >
                <LiquidGlass
                  variant="panel"
                  intensity="medium"
                  rippleEffect
                  flowOnHover
                  stretchOnDrag={false}
                  className="mt-0 min-w-[160px] rounded-md p-1 text-sm shadow-xl"
                >
                  {["vi", "en", "fr"].map((lng, index) => {
                    const Flag = Flags[lng as FlagType]
                    return (
                      <motion.div
                        key={lng}
                        custom={index}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={() => changeLanguage(lng as FlagType)}
                        className="flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 hover:bg-accent"
                      >
                        <Flag className="mr-2 size-5" />
                        <span>{lng === "vi" ? "Vietnamese" : lng === "en" ? "English" : "French"} ({lng})</span>
                      </motion.div>
                    )
                  })}
                </LiquidGlass>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </FloatingPortal>
    </motion.div>
  )
}
