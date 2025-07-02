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
          meteorCount={5}
          particleSpread={10}
          speed={0.1}
          meteorSpeed={0.5}
          // backgroundMode="night"
          alphaParticles={true}
          particleBaseSize={30}
          meteorBaseSize={50}
          sizeRandomness={0.7}
          cameraDistance={25}
          disableRotation={true}
          // precessionRate={0.02}
          // semiMajorAxisRange={[0.3, 0.8]}
          // useSpirograph={false}
        />
      </ClickSpark>
    </div>
  );
}
