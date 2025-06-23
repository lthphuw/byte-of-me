"use client"

import { useTheme } from "next-themes";
import { FuzzyText } from "./fuzzy-text";


export function FuzzyError() {
    const { resolvedTheme } = useTheme();
    return (
        <FuzzyText
            baseIntensity={0.01}
            hoverIntensity={0.2}
            enableHover={true}
            color={resolvedTheme === "dark" ? "#ccc" : "#111"}
        >
            Error
        </FuzzyText>
    )
}