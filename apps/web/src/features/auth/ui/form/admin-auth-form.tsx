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
import { toast } from 'sonner';

import { logInToDashboard } from '@/features/auth/lib/log-in-to-dashboard';
import {
  type UserAuthLoginFormValues,
  userAuthLoginSchema,
} from '@/features/auth/model/user-auth-login-schema';
import { cn } from '@/shared/lib/utils';

type AdminAuthFormProps = React.HTMLAttributes<HTMLDivElement>;

export function AdminAuthForm({ className, ...props }: AdminAuthFormProps) {
  const form = useForm<UserAuthLoginFormValues>({
    resolver: zodResolver(userAuthLoginSchema),
    defaultValues: {
      email: '',
    },
  });

  const {
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = form;

  const searchParams = useSearchParams();
  const fromParam = searchParams?.get('from');

  async function onSubmit(data: UserAuthLoginFormValues) {
    const email = data.email.toLowerCase();
    // Passed through raw. Deciding what a missing or hostile `from` means is
    // `sanitizeCallbackUrl`'s job, server-side — a second copy of that rule
    // here is both unenforceable (the action is callable directly) and the way
    // the two versions drift apart.
    const signInResult = await logInToDashboard(email, fromParam);

    if (!signInResult.success) {
      toast.error('Something went wrong.', {
        description:
          signInResult.errorMsg ||
          'Failed to send login link. Please try again.',
      });
      return;
    }

    toast('Check your email', {
      description: `We sent you a login link to ${email}. Be sure to check your spam too.`,
    });
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
                <FormLabel className="sr-only">Email</FormLabel>
                <FormControl>
                  <Input
                    placeholder="lthphuw@example.com"
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
            Sign In with Email
          </Button>
        </form>
      </Form>
    </div>
  );
}
