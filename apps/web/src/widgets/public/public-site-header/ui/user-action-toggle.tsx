'use client';

import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';

import { logOut } from '@/features/auth';
import { menuTransition, menuVariants } from '@/shared/config/anim';
// Shared config
import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

export function UserActionToggle() {
  const t = useTranslations('global.userToggle');
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  if (!session?.user) return null;

  const initials = session.user.email?.slice(0, 2).toUpperCase() || 'U';

  const handleLogout = async () => {
    queryClient.removeQueries({ queryKey: ['blog-like'] });
    queryClient.removeQueries({ queryKey: ['blog-clap'] });

    await Promise.all([logOut(), signOut({ redirect: false })]);
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative size-10 rounded-full bg-muted p-0 text-muted-foreground transition-all hover:scale-105 hover:bg-muted/80"
        >
          <span className="text-xs font-semibold">{initials}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-56 overflow-hidden"
        sideOffset={8}
        forceMount
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            variants={menuVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={menuTransition}
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {session.user.name || session.user.role || 'User'}
                </p>
                <p className="truncate text-xs leading-none text-muted-foreground">
                  {session.user.email}
                </p>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer gap-2"
            >
              <LogOut className="size-4" />
              {t('signOut')}
            </DropdownMenuItem>
          </motion.div>
        </AnimatePresence>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
