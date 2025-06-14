"use client";
import { motion } from "framer-motion";

interface CursorProps {
    active?: boolean;
}

const cursorVariants = {
    blinking: {
        opacity: [0, 0, 1, 1],
        transition: {
            duration: 1,
            repeat: Infinity,
            ease: "linear",
            times: [0, 0.5, 0.5, 1],
        },
    },
    hidden: { opacity: 0 },
};

export default function CursorBlinker({ active = true }: CursorProps) {
    return (
        <motion.span
            variants={cursorVariants}
            animate={active ? "blinking" : "hidden"}
            className="ml-1 inline-block h-[1.2em] w-[2px] bg-black align-baseline"
        />
    );
}
