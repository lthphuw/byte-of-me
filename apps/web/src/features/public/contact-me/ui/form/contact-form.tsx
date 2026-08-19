'use client';

import { useMemo, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import {
  Button,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Icons,
  Input,
  Textarea,
} from '@byte-of-me/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  type ContactMessageFailureCode,
  type ContactMessageFormValues,
  createContactMessageSchema,
  MESSAGE_MAX_LENGTH,
  sendContactMessage,
} from '@/entities/contact-message';

const EMPTY_VALUES: ContactMessageFormValues = {
  name: '',
  email: '',
  subject: '',
  message: '',
};

export function ContactForm() {
  const t = useTranslations('contact.form');
  const tValidation = useTranslations('contact.validation');
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null
  );

  // The action reports *why* it failed as a code; `errorMsg` is English, and a
  // Vietnamese visitor who hit the rate limit used to be shown it verbatim.
  // Listed case by case so a code added server-side later falls to `undefined`
  // and the caller renders `errorMsg` rather than an empty box.
  const failureMessage = (code: ContactMessageFailureCode | undefined) => {
    switch (code) {
      case 'invalid':
        return t('errors.invalid');
      case 'rate-limited':
        return t('errors.rateLimited');
      case 'unknown':
        return t('errors.unknown');
      default:
        return undefined;
    }
  };

  // The schema carries message *keys*; the locale is only knowable here, since
  // the entity is shared with the dashboard and cannot call next-intl.
  const schema = useMemo(
    () => createContactMessageSchema((key) => tValidation(key)),
    [tValidation]
  );

  const form = useForm<ContactMessageFormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: EMPTY_VALUES,
  });

  const onSubmit = (values: ContactMessageFormValues) => {
    setResult(null);

    startTransition(async () => {
      const res = await sendContactMessage(values);

      if (res.success) {
        form.reset(EMPTY_VALUES);
        setResult({ ok: true, message: t('successDescription') });
        toast.success(t('successTitle'));
        return;
      }

      const message =
        failureMessage(res.errorCode) || res.errorMsg || t('errors.unknown');
      setResult({ ok: false, message });
      toast.error(t('errorTitle'), { description: message });
    });
  };

  return (
    <Form {...form}>
      {/* `noValidate`: the email input is `type="email"`, so without it the
          browser's own bubble fires first — in the OS language, not the site's. */}
      {/* `gap`, not `space-y`: the live region below is always mounted, and
          `space-y` would have kept spacing a zero-height first child. */}
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4 md:gap-6"
      >
        {/* Mounted at all times so the success text is announced when it
            appears; a live region inserted together with its content is not. */}
        <div role="status" aria-live="polite" className="empty:hidden">
          {result?.ok ? (
            <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3">
              <Icons.check aria-hidden className="mt-0.5 size-4 shrink-0" />
              <div className="space-y-2 text-sm">
                <p className="font-medium">{t('successTitle')}</p>
                <p className="text-muted-foreground">{result.message}</p>
              </div>
            </div>
          ) : null}
        </div>

        {result && !result.ok ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/50 p-3"
          >
            <Icons.warning
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-destructive"
            />
            <div className="space-y-2 text-sm">
              <p className="font-medium text-destructive">{t('errorTitle')}</p>
              <p className="text-muted-foreground">{result.message}</p>
            </div>
          </div>
        ) : null}

        {/* Every field below carries `h-11 md:h-9`: the shared Input defaults to
            h-9 (36px), which is under the 44px touch minimum this public form has
            to meet. The default itself stays at 36px on purpose — the dashboard
            forms are deliberately dense — so the height is raised per surface,
            and only below md where the pointer is a finger. The submit button
            takes the same pair; it was the one control that missed it. */}

        {/* Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('name')}{' '}
                {/* `required` on the input is what a screen reader announces;
                    the asterisk is the sighted-only duplicate of it. */}
                <span aria-hidden="true" className="text-destructive">
                  *
                </span>
              </FormLabel>
              <FormControl>
                <Input
                  required
                  autoComplete="name"
                  placeholder={t('namePlaceholder')}
                  className="h-11 md:h-9"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Email Field */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('email')}{' '}
                <span aria-hidden="true" className="text-destructive">
                  *
                </span>
              </FormLabel>
              <FormControl>
                <Input
                  required
                  type="email"
                  autoComplete="email"
                  placeholder={t('emailPlaceholder')}
                  className="h-11 md:h-9"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Subject */}
        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('subject')}{' '}
                <span className="font-normal text-muted-foreground">
                  ({t('optional')})
                </span>
              </FormLabel>
              {/* No autoComplete: the HTML autofill token list has nothing for a
                  message subject, and `off` would suppress the browser's own
                  previously-entered suggestions, which are the useful ones here. */}
              <FormControl>
                <Input
                  placeholder={t('subjectPlaceholder')}
                  className="h-11 md:h-9"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        {/* Message */}
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between gap-2">
                <FormLabel>
                  {t('message')}{' '}
                  <span aria-hidden="true" className="text-destructive">
                    *
                  </span>
                </FormLabel>
                <FormDescription className="text-xs tabular-nums">
                  {t('messageCounter', {
                    count: String(field.value.length),
                    max: String(MESSAGE_MAX_LENGTH),
                  })}
                </FormDescription>
              </div>
              <FormControl>
                <Textarea
                  required
                  rows={6}
                  placeholder={t('messagePlaceholder')}
                  className="min-h-[9rem] resize-y"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        {/* Submit */}
        <Button
          type="submit"
          className="h-11 w-full md:h-9"
          disabled={isPending}
        >
          {isPending && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
          {isPending ? t('submitting') : t('submit')}
        </Button>
      </form>
    </Form>
  );
}
