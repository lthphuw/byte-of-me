'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Icons,
  Input,
} from '@byte-of-me/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { logInToSharedSpace } from '@/features/auth/lib/log-in-to-shared-space';
import {
  type UserAuthLoginFormValues,
  userAuthLoginSchema,
} from '@/features/auth/model/user-auth-login-schema';
import { cn } from '@/shared/lib/utils';

type InviteAuthFormProps = React.HTMLAttributes<HTMLDivElement>;

/**
 * The share recipient's email form.
 *
 * A sibling of `AdminAuthForm` rather than a mode of it: that one calls
 * `logInToDashboard`, which refuses every address but the owner's, and the
 * two forms differ in the one place that matters most — this one must say the
 * SAME thing whatever address is submitted.
 */
export function InviteAuthForm({ className, ...props }: InviteAuthFormProps) {
  const t = useTranslations('share.invite');
  const form = useForm<UserAuthLoginFormValues>({
    resolver: zodResolver(userAuthLoginSchema),
    defaultValues: { email: '' },
  });

  const {
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = form;

  const searchParams = useSearchParams();
  const fromParam = searchParams?.get('from');

  async function onSubmit(data: UserAuthLoginFormValues) {
    // Passed through raw. Deciding what a missing or hostile `from` means is
    // `sanitizeCallbackUrl`'s job, server-side — a second copy of that rule
    // here is both unenforceable (the action is callable directly) and the
    // way the two versions drift apart.
    const result = await logInToSharedSpace(data.email, fromParam);

    if (!result.success) {
      toast.error(t('failed'));
      return;
    }

    // Deliberately unconditional, and deliberately hedged ("if that address
    // has been invited"). The action already answers identically whether or
    // not a grant exists; a confirmation that said "sent" only when one did
    // would put the enumeration oracle straight back into the UI.
    toast(t('sent'));
    form.reset();
  }

  return (
    <div className={cn('grid gap-6', className)} {...props}>
      <Form {...form}>
        <form
          id="invite-auth-form"
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-2"
        >
          <FormField
            control={control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">
                  {t('emailPlaceholder')}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('emailPlaceholder')}
                    type="email"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect="off"
                    disabled={isSubmitting}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            )}
            {t('submit')}
          </Button>
        </form>
      </Form>
    </div>
  );
}
