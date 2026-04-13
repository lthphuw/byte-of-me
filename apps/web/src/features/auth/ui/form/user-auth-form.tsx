'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { logIn } from '@/features/auth/lib/log-in';
import {
  type UserAuthLoginFormValues,
  userAuthLoginSchema,
} from '@/features/auth/model/user-auth-login-schema';
import { toast } from '@/shared/hooks/use-toast';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/form';
import { Icons } from '@/shared/ui/icons';
import { Input } from '@/shared/ui/input';

import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';

type UserAuthFormProps = React.HTMLAttributes<HTMLDivElement>;

export function UserAuthForm({ className, ...props }: UserAuthFormProps) {
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
    const callbackUrl =
      !fromParam || fromParam.includes('/auth/login')
        ? '/dashboard'
        : fromParam;
    const signInResult = await logIn(email, callbackUrl);

    if (!signInResult.success) {
      toast({
        title: 'Something went wrong.',
        description:
          signInResult.errorMsg ||
          'Failed to send login link. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Check your email',
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
