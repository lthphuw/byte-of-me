'use client';

import * as React from 'react';
import { useTransition } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { sendContactMessage } from '@/lib/actions/dashboard/contact-message/send-contact-message';
import {
  ContactMessageFormValues,
  contactMessageSchema,
} from '@/lib/schemas/contact-message.schema';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Icons } from '@/components/icons';
import { RichTextEditorLite } from '@/components/tiptap/rich-text-editor-lite';

export function ContactForm({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

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
      const res = await sendContactMessage(
        {
          ...values,
          message: values.message ?? '',
        },
        userId
      );

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
        className="max-w-4xl mx-auto space-y-4"
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
              <div className="flex justify-between items-center">
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
