'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

import { GoogleAuthButton } from '@/features/auth/ui/google-auth-button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';

import { GithubAuthButton } from './github-auth-button';

interface AuthModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  children?: React.ReactNode;
}

export function AuthModal({ isOpen, onClose, children }: AuthModalProps) {
  const t = useTranslations('auth');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <AnimatePresence>
        {isOpen && (
          <DialogContent className="w-[90vw] overflow-hidden rounded-2xl p-6 sm:max-w-[400px]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="flex flex-col"
            >
              {/* Header */}
              <DialogHeader className="space-y-2 text-center">
                <DialogTitle className="text-xl font-semibold">
                  {t('signInTitle')}
                </DialogTitle>
              </DialogHeader>

              {/* Content */}
              <motion.div
                className="flex flex-col gap-5 pt-6"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: {
                    transition: {
                      staggerChildren: 0.05,
                    },
                  },
                }}
              >
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 6 },
                    visible: { opacity: 1, y: 0 },
                  }}
                >
                  <GithubAuthButton className="h-11 w-full text-sm font-medium" />
                </motion.div>

                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 6 },
                    visible: { opacity: 1, y: 0 },
                  }}
                >
                  <GoogleAuthButton className="h-11 w-full text-sm font-medium" />
                </motion.div>

                {children && (
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 6 },
                      visible: { opacity: 1, y: 0 },
                    }}
                    className="text-center text-sm text-muted-foreground"
                  >
                    {children}
                  </motion.div>
                )}
              </motion.div>
            </motion.div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  );
}
