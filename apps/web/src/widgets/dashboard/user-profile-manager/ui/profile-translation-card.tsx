'use client';

import type { Control, UseFormReturn } from 'react-hook-form';
import type { UserProfileFormValues } from '@/entities';
import { DeleteButton } from '@/shared/ui/delete-button';
import { FormControl, FormField, FormItem, FormLabel } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Separator } from '@/shared/ui/separator';
import { Textarea } from '@/shared/ui/textarea';
import { RichTextEditor } from '@/shared/ui/tiptap/rich-text-editor';

interface ProfileTranslationCardProps {
  form: UseFormReturn<UserProfileFormValues>;
  index: number;
  onRemove: () => void;
}

export function ProfileTranslationCard({
  form,
  index,
  onRemove,
}: ProfileTranslationCardProps) {
  return (
    <div className="bg-background/50 space-y-6 rounded-xl border p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <FormField
          control={form.control}
          name={`translations.${index}.language`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Language</FormLabel>
              <FormControl>
                <Input {...field} placeholder="en, vi..." className="w-32" />
              </FormControl>
            </FormItem>
          )}
        />

        <DeleteButton onClick={onRemove}/>
      </div>

      <Separator />

      {/* Identity */}
      <Section title="Identity">
        <div className="grid gap-4 md:grid-cols-3">
          <Field
            control={form.control}
            name={`translations.${index}.firstName`}
            label="First Name"
          />
          <Field
            control={form.control}
            name={`translations.${index}.lastName`}
            label="Last Name"
          />
          <Field
            control={form.control}
            name={`translations.${index}.displayName`}
            label="Display Name"
          />
        </div>
      </Section>

      {/* Content */}
      <Section title="Content">
        <div className="grid gap-4 md:grid-cols-1">
          <Field
            control={form.control}
            name={`translations.${index}.greeting`}
            label="Greeting"
          />

          <FormField
            control={form.control}
            name={`translations.${index}.tagLine`}
            render={({ field }) => (
              <FormItem >
                <FormLabel>Short Bio</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ''}
                    className="min-h-[80px] resize-none"
                    placeholder="Short bio..."
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`translations.${index}.bio`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Short Bio</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ''}
                    className="min-h-[80px] resize-none"
                    placeholder="Short bio..."
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </Section>

      {/* Quote */}
      <Section title="Quote">
        <div className="grid gap-4">
          <FormField
            control={form.control}
            name={`translations.${index}.quote`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quote</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ''}
                    className="min-h-[80px] resize-none"
                    placeholder="Enter an inspiring quote..."
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <Field
            control={form.control}
            name={`translations.${index}.quoteAuthor`}
            label="Author"
          />
        </div>
      </Section>

      {/* About Me (Rich Text) */}
      <Section title="About Me">
        <FormField
          control={form.control}
          name={`translations.${index}.aboutMe`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <RichTextEditor value={field.value} onChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
      </Section>
    </div>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">
        {title}
      </p>
      {children}
    </div>
  );
}

interface FieldProps {
  control: Control<UserProfileFormValues>;
  name: any;
  label: string;
  className?: string;
}

function Field({ control, name, label, className }: FieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input {...field} value={field.value ?? ''} />
          </FormControl>
        </FormItem>
      )}
    />
  );
}
