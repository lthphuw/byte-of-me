"use client"

import { easeOut, useAnimationControls } from "framer-motion"
import { useEffect, useState } from "react"

const SCROLL_THRESHOLD = 30
const COMPACT_OFFSET = 16
const COMPACT_WIDTH_OFFSET = 8

const transitionConfig = {
    ease: easeOut,
    duration: 0.3,
}

export function useCompactHeader(scrollY: number | null, width?: number) {
    const [isCompact, setIsCompact] = useState(false)
    const animationControls = useAnimationControls()

    useEffect(() => {
        const compact = scrollY !== null && scrollY >= SCROLL_THRESHOLD
        setIsCompact(compact)

        if (width) {
            animationControls.start({
                width: compact ? `calc(${width}px + ${COMPACT_WIDTH_OFFSET}px)` : "100%",
                borderRadius: compact ? COMPACT_OFFSET : 0,
                left: compact ? COMPACT_OFFSET : 0,
                top: compact ? COMPACT_OFFSET : 0,
            }, transitionConfig);
        }

    }, [animationControls, scrollY, width])

    return {
        isCompact,
        animationControls,
        transitionConfig,
        constants: {
            COMPACT_OFFSET,
            COMPACT_WIDTH_OFFSET,
            COMPACT_PADDING: "12px 16px",
            DEFAULT_PADDING: "16px",
            COMPACT_HEIGHT: 56,
            DEFAULT_HEIGHT: 64,
        }
    }
}
