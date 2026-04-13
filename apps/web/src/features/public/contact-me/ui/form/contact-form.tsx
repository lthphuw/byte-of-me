'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';

import { sendContactMessage } from '@/entities/contact-message/api/send-contact-message';
import {
  contactMessage,
  type ContactMessageFormValues,
} from '@/entities/contact-message/schemas';
import { useToast } from '@/shared/hooks/use-toast';
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
import { RichTextEditorLite } from '@/shared/ui/tiptap/rich-text-editor-lite';

export function ContactForm() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<ContactMessageFormValues>({
    resolver: zodResolver(contactMessage),
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

        toast({
          title: 'Message sent!',
        });
      } else {
        toast({
          title: 'Failed to send message',
        });
      }
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="mx-auto max-w-4xl space-y-4"
      >
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
                <Input placeholder="Your name" {...field} />
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
                <Input placeholder="email@example.com" {...field} />
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
              <FormControl>
                <Input placeholder="What is this regarding?" {...field} />
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
