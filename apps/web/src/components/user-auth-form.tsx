'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';

import { cn } from '@/lib/utils';
import {
  UserAuthLoginSchema,
  userAuthLoginSchema,
} from '@/lib/validations/user-auth-login';
import { buttonVariants } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { Icons } from '@/components/icons';





type UserAuthFormProps = React.HTMLAttributes<HTMLDivElement>;

export function UserAuthForm({ className, ...props }: UserAuthFormProps) {
  const form = useForm<UserAuthLoginSchema>({
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

  async function onSubmit(data: UserAuthLoginSchema) {
    const signInResult = await signIn('email', {
      email: data.email.toLowerCase(),
      redirect: false,
      callbackUrl: searchParams?.get('from') || '/dashboard',
    });

    if (!signInResult?.ok) {
      toast({
        title: 'Something went wrong.',
        description: 'Your sign in request failed. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Check your email',
      description: 'We sent you a login link. Be sure to check your spam too.',
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

          <button
            type="submit"
            className={cn(buttonVariants())}
            disabled={isSubmitting}
          >
            {isSubmitting && (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            )}
            Sign In with Email
          </button>
        </form>
      </Form>
    </div>
  );
}
