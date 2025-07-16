'use client';

import { useTheme } from 'next-themes';

import { useIsMobile } from '@/hooks/use-is-mobile';

import { NightOfStars } from './night-of-stars';

export function BackgroundWrapper() {
  const { resolvedTheme } = useTheme();
  const isMobile = useIsMobile();
  return (
    <div className="absolute opacity-80 inset-0 z-[10]">
      <NightOfStars
        backgroundMode={resolvedTheme as any}
        particleCount={2000}
        meteorCount={0}
        particleSpread={10}
        speed={0.1}
        meteorSpeed={0.5}
        alphaParticles={true}
        particleBaseSize={isMobile ? 35 : 50}
        meteorBaseSize={100}
        sizeRandomness={0.7}
        cameraDistance={25}
        disableRotation={true}
      />
    </div>
  );
}
