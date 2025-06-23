import * as React from "react"

import { Icons } from "@/components/icons"
import { cn } from "@/lib/utils"
import { Button } from "./ui/button"

export function SiteFooter({ className }: React.HTMLAttributes<HTMLElement>) {
  return (
    <footer className={cn("relative z-20", className)}>
      <div className="container flex flex-col items-center justify-between gap-4 py-10 md:h-16 md:flex-row md:py-0">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <Icons.logo />
          <p className="text-center text-sm leading-loose md:text-left">
            Built by{" "}
            <a
              href="#"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4"
            >
              phu
            </a>
          </p>
        </div>
        <Button variant={'icon'} className="relative size-9 px-0 focus:outline-none">
          <Icons.debug />
        </Button>
      </div>
    </footer>
  )
}
