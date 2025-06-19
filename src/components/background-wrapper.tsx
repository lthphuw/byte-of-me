"use client"

import { useTheme } from "next-themes";
import { ClickSpark } from "./click-spark";
import Particles from "./particles";

export function BackgroundWrapper() {
    const { resolvedTheme } = useTheme();
    const color = resolvedTheme == 'light' ? '#1D1D1D' : '#fafafa'
    return (
        <div className="absolute opacity-80 inset-0 z-[10]">
            <ClickSpark
                sparkColor={color}
                sparkSize={10}
                sparkRadius={15}
                sparkCount={8}
                duration={400}
            >
                <Particles
                    particleColors={[color, color]}
                    particleCount={200}
                    particleSpread={30}
                    speed={0.1}
                    particleBaseSize={100}
                    moveParticlesOnHover={true}
                    alphaParticles={false}
                    disableRotation={false}
                    sizeRandomness={1}
                />
            </ClickSpark>
        </div>
    )
}