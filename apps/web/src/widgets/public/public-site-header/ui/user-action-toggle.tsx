'use client';

import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';

import { logOut } from '@/features/auth';
import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

const toggleVariants = {
  initial: { opacity: 0, scale: 0.9, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.9, y: -8 },
};

export function UserActionToggle() {
  const t = useTranslations('global.userToggle');
  const { data: session } = useSession();

  if (!session?.user) return null;

  const initials = session.user.email?.slice(0, 2).toUpperCase() || 'U';
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    await logOut();

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['blog-like'] }),
      queryClient.invalidateQueries({ queryKey: ['blog-clap'] }),
    ]);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative size-10 rounded-full p-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div className="flex size-10 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground transition-transform hover:scale-105">
            {initials}
          </div>
        </Button>
      </DropdownMenuTrigger>

      {/* AnimatePresence handles the exit animation when the menu closes */}
      <AnimatePresence>
        <DropdownMenuContent asChild forceMount align="end" className="w-56" sideOffset={8}>
          <motion.div
            variants={toggleVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {session.user.name || 'User'}
                </p>
                <p className="truncate text-xs leading-none text-muted-foreground">
                  {session.user.email}
                </p>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => handleLogout()}
              className="cursor-pointer gap-2"
            >
              <LogOut className="size-4" />
              {t('signOut')}
            </DropdownMenuItem>
          </motion.div>
        </DropdownMenuContent>
      </AnimatePresence>
    </DropdownMenu>
  );
}
