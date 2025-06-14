"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import { useState, useRef } from "react"

interface MiniGalleryStackProps {
    images: {
        src: string
        alt?: string
    }[]
}

export function MiniGalleryStack({ images }: MiniGalleryStackProps) {
    const [stack, setStack] = useState(images)
    const containerRef = useRef<HTMLDivElement>(null)

    const moveToEnd = (from: number) => {
        setStack(prev => move(prev, from, prev.length - 1))
    }

    return (
        <div
            ref={containerRef}
            className="relative mx-auto flex h-[280px] w-full max-w-[320px] items-center justify-center"
        >
            <ul className="relative h-[220px] w-[280px]">
                {stack.map((img, index) => {
                    const isTop = index === 0
                    return (
                        <motion.li
                            key={img.src}
                            className="absolute list-none overflow-hidden rounded-xl border bg-background shadow-md"
                            style={{
                                width: "100%",
                                height: "100%",
                                cursor: isTop ? "grab" : "auto",
                            }}
                            animate={{
                                top: index * -10,
                                scale: 1 - index * 0.06,
                                zIndex: stack.length - index,
                            }}
                            drag={isTop ? "y" : false}
                            dragConstraints={{ top: 0, bottom: 0 }}
                            dragElastic={0.4}
                            onDragEnd={() => moveToEnd(index)}
                            whileTap={{ cursor: "grabbing" }}
                        >
                            <Image
                                src={img.src}
                                alt={img.alt || "Gallery photo"}
                                fill
                                className="pointer-events-none object-cover"
                            />
                        </motion.li>
                    )
                })}
            </ul>
        </div>
    )
}

// ✅ move function (no lodash needed)
function move<T>(arr: T[], from: number, to: number): T[] {
    const newArr = [...arr]
    const item = newArr.splice(from, 1)[0]
    newArr.splice(to, 0, item)
    return newArr
}
