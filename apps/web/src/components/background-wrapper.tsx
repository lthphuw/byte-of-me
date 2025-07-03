'use client';

import { useTheme } from 'next-themes';

import { ClickSpark } from './click-spark';
import { NightOfStars } from './night-of-stars';

export function BackgroundWrapper() {
  const { resolvedTheme } = useTheme();
  const color = resolvedTheme == 'light' ? '#1D1D1D' : '#fafafa';
  return (
    <div className="fixed opacity-80 inset-0 z-[10]">
      <ClickSpark
        sparkColor={color}
        sparkSize={10}
        sparkRadius={15}
        sparkCount={8}
        duration={400}
      >
        <NightOfStars
          backgroundMode={resolvedTheme as any}
          particleCount={2000}
          meteorCount={100}
          particleSpread={10}
          speed={0.1}
          meteorSpeed={0.5}
          alphaParticles={true}
          particleBaseSize={50}
          meteorBaseSize={100}
          sizeRandomness={0.7}
          cameraDistance={25}
          disableRotation={true}
        />
      </ClickSpark>
    </div>
  );
}
