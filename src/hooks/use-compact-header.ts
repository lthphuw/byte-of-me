"use client"

import type { Transition } from "framer-motion"
import { useAnimationControls } from "framer-motion"
import { useEffect, useState } from "react"

const SCROLL_THRESHOLD = 30
const COMPACT_BORDER_RADIUS = 16
const COMPACT_TOP_OFFSET = 32
const COMPACT_X_OFFSET = 48
const COMPACT_WIDTH_OFFSET = 8

const transitionConfig: Transition = {
    duration: 0.4,
    ease: "easeOut",
}

export function useCompactHeader(scrollY: number | null, width?: number) {
    const [isCompact, setIsCompact] = useState(false);
    const animationControls = useAnimationControls();

    useEffect(() => {
        const compact = scrollY !== null && scrollY >= SCROLL_THRESHOLD;
        setIsCompact(compact);
        if (width) {
            animationControls.start({
                width: compact ? `calc(${width}px + ${16}px)` : "100%",
                borderRadius: compact ? COMPACT_BORDER_RADIUS : 0,
                left: compact ? COMPACT_X_OFFSET : 0,
                top: compact ? COMPACT_TOP_OFFSET : 0,
            }, transitionConfig);
        }
    }, [animationControls, scrollY, width])

    return {
        isCompact,
        animationControls,
        transitionConfig,
        constants: {
            COMPACT_BORDER_RADIUS,
            COMPACT_TOP_OFFSET,
            COMPACT_X_OFFSET,
            COMPACT_WIDTH_OFFSET,
            COMPACT_PADDING: "12px 16px",
            DEFAULT_PADDING: "16px",
            COMPACT_HEIGHT: 56,
            DEFAULT_HEIGHT: 64,
        }
    }
}
