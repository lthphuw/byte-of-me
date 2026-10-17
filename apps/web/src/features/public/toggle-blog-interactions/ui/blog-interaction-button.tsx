'use client';

import { type ComponentType, useState } from 'react';
import { INTERACTION } from '@byte-of-me/api-core';
import { Button, Icons, motionDuration, motionEase } from '@byte-of-me/ui';
import { AnimatePresence, m } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';

import { InteractionButtonLoading } from './interaction-button-loading';

import { AuthModal } from '@/features/auth/ui/auth-modal';
import {
  useBlogInteraction,
  type UseBlogInteractionOptions,
} from '@/features/public/toggle-blog-interactions/lib/use-blog-interaction';
import { cn } from '@/shared/lib/utils';

// A tween on purpose: framer's default for x/y is a spring with ~0.45 bounce,
// past the 0.2 ceiling for a toggle. The fade takes a gentler curve so the
// dots do not vanish before they land.
const BURST_TRANSITION = {
  duration: motionDuration.base,
  ease: motionEase.out,
  opacity: { duration: motionDuration.base, ease: 'easeOut' },
} as const;

/** The two reactions differ in icon and colour only; the motion is shared. */
const TONE: Record<
  INTERACTION,
  {
    Icon: ComponentType<{ className?: string }>;
    active: string;
    burst: string;
    dot: string;
    filled: string;
  }
> = {
  [INTERACTION.CLAP]: {
    Icon: Icons.clap,
    active: 'text-amber-500',
    burst: 'bg-amber-500/30',
    dot: 'bg-amber-500',
    filled: 'fill-amber-500 stroke-amber-500',
  },
  [INTERACTION.LIKE]: {
    Icon: Heart,
    active: 'text-red-500',
    burst: 'bg-red-500/30',
    dot: 'bg-red-500',
    filled: 'fill-red-500 stroke-red-500',
  },
};

export function BlogInteractionButton(props: UseBlogInteractionOptions) {
  const t = useTranslations('blogDetails');
  const { data: session } = useSession();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const interaction = useBlogInteraction(props);
  const tone = TONE[props.kind];

  if (!interaction.hasData) {
    return interaction.isError ? (
      <Button
        variant="ghost"
        size="sm"
        onClick={interaction.retry}
        className="h-8 px-2 text-xs text-muted-foreground"
      >
        {t('retry')}
      </Button>
    ) : (
      <InteractionButtonLoading />
    );
  }

  const { isInteracted, count } = interaction;
  const { Icon } = tone;

  return (
    <>
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <Button
        variant="ghost"
        size="sm"
        onClick={() =>
          session ? void interaction.toggle() : setIsAuthModalOpen(true)
        }
        disabled={interaction.isToggling}
        className={cn(
          'px-0 group gap-2 hover:bg-transparent',
          isInteracted && tone.active
        )}
      >
        <div className="relative flex h-6 w-6 items-center justify-center">
          <AnimatePresence initial={false}>
            {isInteracted && (
              <>
                <m.div
                  initial={{ scale: 0.95, opacity: 0.6 }}
                  animate={{ scale: 2, opacity: 0 }}
                  exit={{
                    opacity: 0,
                    transition: {
                      duration: motionDuration.fast,
                      ease: motionEase.in,
                    },
                  }}
                  transition={BURST_TRANSITION}
                  className={cn(
                    'absolute h-full w-full rounded-full',
                    tone.burst
                  )}
                />
                {[...Array(6)].map((_, i) => (
                  <m.span
                    key={i}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 0.95 }}
                    animate={{
                      x: (i - 2.5) * 8,
                      y: -Math.abs(i - 2.5) * 6,
                      opacity: 0,
                      scale: 1.2,
                    }}
                    transition={BURST_TRANSITION}
                    className={cn('absolute h-1.5 w-1.5 rounded-full', tone.dot)}
                  />
                ))}
              </>
            )}
          </AnimatePresence>

          <m.div
            animate={{ scale: isInteracted ? [1, 1.3, 1] : 1 }}
            initial={false}
            transition={{ duration: motionDuration.base }}
          >
            <Icon
              className={cn(
                'h-5 w-5 transition-colors duration-200',
                isInteracted ? tone.filled : 'stroke-current'
              )}
            />
          </m.div>
        </div>
        <span className="font-medium">{count}</span>
      </Button>
    </>
  );
}
