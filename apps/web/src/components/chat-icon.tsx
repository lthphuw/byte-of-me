'use client';

import { useIsMobile } from "@/hooks/use-is-mobile";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { FloatingPortal } from "@floating-ui/react";
import { Icons } from "./icons";

export interface ChatIconProps {
    className?: string;
    style?: React.CSSProperties;
}

export function ChatIcon({ className, style }: ChatIconProps) {
    const isMobile = useIsMobile();
    const pathname = usePathname();

    if (!isMobile || pathname.includes("/ask-me")) return null;

    return (
        <FloatingPortal>
            <Link
                href="/ask-me"
                className={cn(
                    "fixed bottom-12 right-1 z-[9999]",
                    "group pointer-events-auto",
                    className
                )}
                style={style}
            >
                {/* Background radiant pulse effect */}
                <div className="absolute inset-0 animate-ping-3 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 opacity-40 scale-100 group-hover:scale-105 transition-transform" />

                {/* Main button */}
                <div className="relative h-10 w-10 rounded-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-500 shadow-lg text-white hover:scale-105 active:scale-95 transition-all duration-200">
                    <Icons.chat className="w-5 h-5" />
                </div>
            </Link>
        </FloatingPortal>
    );
}
