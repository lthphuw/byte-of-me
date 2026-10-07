'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  motionStagger,
} from '@byte-of-me/ui';
import { m, stagger } from 'framer-motion';
import { useTranslations } from 'next-intl';

import { GithubAuthButton } from './github-auth-button';

import { GoogleAuthButton } from '@/features/auth/ui/google-auth-button';

interface AuthModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  children?: React.ReactNode;
}

export function AuthModal({ isOpen, onClose, children }: AuthModalProps) {
  const t = useTranslations('auth');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {isOpen && (
        <DialogContent className="w-[90vw] overflow-hidden rounded-2xl p-6 sm:max-w-[400px]">
          {/* No scale or fade of its own: DialogContent already zooms and fades
              in, and a second one on top started the modal at 0.9. */}
          <div className="flex flex-col">
            {/* Header */}
            <DialogHeader className="space-y-2 text-center">
              <DialogTitle className="text-xl font-semibold">
                {t('signInTitle')}
              </DialogTitle>
            </DialogHeader>

            {/* Content */}
            <m.div
              className="flex flex-col gap-5 pt-6"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    delayChildren: stagger(motionStagger.step),
                  },
                },
              }}
            >
              <m.div
                variants={{
                  hidden: { opacity: 0, y: 6 },
                  visible: { opacity: 1, y: 0 },
                }}
              >
                <GithubAuthButton className="h-11 w-full text-sm font-medium" />
              </m.div>

              <m.div
                variants={{
                  hidden: { opacity: 0, y: 6 },
                  visible: { opacity: 1, y: 0 },
                }}
              >
                <GoogleAuthButton className="h-11 w-full text-sm font-medium" />
              </m.div>

              {children && (
                <m.div
                  variants={{
                    hidden: { opacity: 0, y: 6 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  className="text-center text-sm text-muted-foreground"
                >
                  {children}
                </m.div>
              )}
            </m.div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
