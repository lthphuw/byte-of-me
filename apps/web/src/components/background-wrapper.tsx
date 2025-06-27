'use client';

import { useTheme } from 'next-themes';

import { ClickSpark } from './click-spark';
import { NightOfStars } from './night-of-stars';

export function BackgroundWrapper() {
  const { resolvedTheme } = useTheme();
  const color = resolvedTheme == 'light' ? '#1D1D1D' : '#fafafa';
  return (
    <div className="absolute opacity-80 inset-0 z-[10]">
      <ClickSpark
        sparkColor={color}
        sparkSize={10}
        sparkRadius={15}
        sparkCount={8}
        duration={400}
      >
        <NightOfStars
          backgroundMode={resolvedTheme as any}
          particleCount={500}
          meteorCount={15}
          meteorBaseSize={100}
          particleSpread={30}
          speed={0.05}
          particleBaseSize={50}
          moveParticlesOnHover={true}
          alphaParticles={false}
          disableRotation={false}
          sizeRandomness={0.5}
          particleHoverFactor={0}
          cameraDistance={30}
        />
      </ClickSpark>
    </div>
  );
}
