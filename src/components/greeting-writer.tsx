"use client";

import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useState } from "react";
import CursorBlinker from "./cursor-blinker";

export interface GreetingWriterProps {
    text?: string;
}

export function GreetingWriter({ text = "Hi, I'm Phu." }: GreetingWriterProps) {
    const [done, setDone] = useState(false);

    const count = useMotionValue(0);
    const rounded = useTransform(count, (latest) => Math.round(latest));
    const displayText = useTransform(rounded, (latest) => text.slice(0, latest));

    useEffect(() => {
        const controls = animate(count, text.length, {
            type: "tween",
            duration: text.length * 0.3,
            ease: "easeInOut",
            onComplete: () => setDone(true),
        });
        return controls.stop;
    }, [count, text.length]);

    return (
        <h1 className="font-mono text-4xl font-bold sm:text-5xl md:text-6xl">
            <motion.span>{displayText}</motion.span>
            <CursorBlinker active={!done} />
        </h1>
    );
}
