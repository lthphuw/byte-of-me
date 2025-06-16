"use client";
import { motion, useAnimationControls, Variants } from "framer-motion";
import { useEffect } from "react";

interface CursorProps {
    active?: boolean;
}

const cursorVariants: Variants = {
    blinking: {
        opacity: [0, 0, 1, 1],
        transition: {
            duration: 1,
            repeat: Infinity,
            ease: "linear",
            times: [0, 0.5, 0.5, 1],
        },
    },
    blinkingFinite: {
        opacity: [0, 0, 1, 1],
        transition: {
            duration: 1,
            repeat: 2, // Nhấp nháy 2 lần trước khi ẩn
            ease: "linear",
            times: [0, 0.5, 0.5, 1],
        },
    },
    hidden: {
        opacity: 0,
        transition: {
            duration: 0, // Chuyển ngay lập tức sang ẩn
        },
    },
};

export default function CursorBlinker({ active = true }: CursorProps) {
    const controls = useAnimationControls();

    useEffect(() => {
        if (active) {
            controls.start("blinking"); // Chạy animation vô hạn khi active
        } else {
            // Khi không active, chạy animation nhấp nháy hữu hạn trước khi ẩn
            controls.start("blinkingFinite").then(() => {
                controls.start("hidden");
            });
        }
    }, [active, controls]);

    return (
        <motion.span
            variants={cursorVariants}
            animate={controls}
            className="ml-1 inline-block h-[1.2em] w-[2px] bg-black align-baseline"
        />
    );
}