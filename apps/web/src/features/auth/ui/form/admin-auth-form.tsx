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

import { logInToDashboard } from '@/features/auth/lib/log-in-to-dashboard';
import {
  type UserAuthLoginFormValues,
  userAuthLoginSchema,
} from '@/features/auth/model/user-auth-login-schema';
import { useServerMutation } from '@/shared/hooks/use-server-mutation';
import { cn } from '@/shared/lib/utils';

type AdminAuthFormProps = React.HTMLAttributes<HTMLDivElement>;

type SendLinkInput = { email: string; from: string | null | undefined };

export function AdminAuthForm({ className, ...props }: AdminAuthFormProps) {
  const t = useTranslations('auth');
  const form = useForm<UserAuthLoginFormValues>({
    resolver: zodResolver(userAuthLoginSchema),
    defaultValues: {
      email: '',
    },
  });

  const { handleSubmit, control } = form;

  const searchParams = useSearchParams();
  const fromParam = searchParams?.get('from');

  const sendLink = useServerMutation<SendLinkInput, string>({
    mutationFn: ({ email, from }) => logInToDashboard(email, from),
    errorMessage: t('sendLinkFailed'),
    onSuccess: (_data, { email }) => {
      toast(t('checkEmailTitle'), {
        description: t('checkEmailDescription', { email }),
      });
    },
  });

  function onSubmit(data: UserAuthLoginFormValues) {
    // Passed through raw. Deciding what a missing or hostile `from` means is
    // `sanitizeCallbackUrl`'s job, server-side — a second copy of that rule
    // here is both unenforceable (the action is callable directly) and the way
    // the two versions drift apart.
    sendLink.mutate({ email: data.email.toLowerCase(), from: fromParam });
  }

  return (
    <div className={cn('grid gap-6', className)} {...props}>
      <Form {...form}>
        <form
          id="user-auth-login-form"
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-2"
        >
          <FormField
            control={control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">{t('email')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('emailPlaceholder')}
                    type="email"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect="off"
                    disabled={sendLink.isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={sendLink.isPending}>
            {sendLink.isPending && (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            )}
            {t('signInWithEmail')}
          </Button>
        </form>
      </Form>
    </div>
  );
}
