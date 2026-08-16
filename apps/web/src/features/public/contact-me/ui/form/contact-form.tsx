'use client';

import { useTransition } from 'react';
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
import dynamic from 'next/dynamic';
import { toast } from 'sonner';

import {
  type ContactMessageFormValues,
  contactMessageSchema,
  sendContactMessage,
} from '@/entities/contact-message';

// Loaded on demand, and via Lite's own subpath (`…/rich-text-editor-lite`, not
// the `…/rich-text-editor` barrel whose `import './tiptap.css'` side effect
// drags the full editor along). This form sits on the public homepage, and a
// static import would put tiptap core + prosemirror (~570 KB raw) into its
// initial JS; deferred, the editor arrives after hydration while the rest of
// the form is already interactive.
const RichTextEditorLite = dynamic(
  () =>
    import('@byte-of-me/ui/rich-text-editor-lite').then(
      (mod) => mod.RichTextEditorLite
    ),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[120px] w-full animate-pulse rounded-md border bg-muted/30" />
    ),
  }
);

export function ContactForm() {
  const [isPending, startTransition] = useTransition();

  const form = useForm<ContactMessageFormValues>({
    resolver: zodResolver(contactMessageSchema),
    defaultValues: {
      name: '',
      email: '',
      subject: '',
      message: '',
    },
  });

  const onSubmit = (values: ContactMessageFormValues) => {
    startTransition(async () => {
      const res = await sendContactMessage({
        ...values,
        message: values.message ?? '',
      });

      if (res.success) {
        form.reset({
          name: '',
          email: '',
          subject: '',
          message: '',
        });

        toast('Message sent!');
      } else {
        toast('Failed to send message');
      }
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="mx-auto max-w-4xl space-y-4"
      >
        {/* Every field below carries `h-11 md:h-9`: the shared Input defaults to
            h-9 (36px), which is under the 44px touch minimum this public form has
            to meet. The default itself stays at 36px on purpose — the dashboard
            forms are deliberately dense — so the height is raised per surface,
            and only below md where the pointer is a finger. */}

        {/* Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Name <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  autoComplete="name"
                  placeholder="Your name"
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
                Email <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="email@example.com"
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
              <FormLabel>Subject</FormLabel>
              {/* No autoComplete: the HTML autofill token list has nothing for a
                  message subject, and `off` would suppress the browser's own
                  previously-entered suggestions, which are the useful ones here. */}
              <FormControl>
                <Input
                  placeholder="What is this regarding?"
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
              <div className="flex items-center justify-between">
                <FormLabel className="flex items-center gap-1">
                  Message <span className="text-destructive">*</span>
                </FormLabel>
                {/*<span className="text-[10px] text-muted-foreground uppercase tracking-wider">*/}
                {/*  {field.value?.length || 0} / 2000*/}
                {/*</span>*/}
              </div>
              <FormControl>
                <RichTextEditorLite
                  value={typeof field.value === 'string' ? field.value : ''}
                  onChange={(val) => field.onChange(val)}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        {/* Submit */}
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
          Send message
        </Button>
      </form>
    </Form>
  );
}
