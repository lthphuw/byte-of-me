'use client';

import { motion } from 'framer-motion';

import { UserAuthForm } from '@/features/auth/ui';
import { Routes } from '@/shared/config/global';
import { Link } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/utils';
import { buttonVariants } from '@/shared/ui/button';
import { Icons } from '@/shared/ui/icons';

export function AuthLogInView() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="absolute left-4 top-4 md:left-8 md:top-8"
      >
        <Link
          href={Routes.Homepage}
          className={cn(buttonVariants({ variant: 'ghost' }), 'gap-2')}
        >
          <Icons.chevronLeft className="h-4 w-4" />
          Back
        </Link>
      </motion.div>

      {/* Center Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]"
      >
        <div className="flex flex-col space-y-2 text-center">
          <Icons.logo className="mx-auto mb-2 h-8 w-8" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your email to sign in to your account
          </p>
        </div>

        <UserAuthForm />
      </motion.div>
    </div>
  );
}
