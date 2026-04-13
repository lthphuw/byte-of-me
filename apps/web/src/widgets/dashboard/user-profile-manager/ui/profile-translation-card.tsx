import { Trash2 } from 'lucide-react';

import { Button } from '@/shared/ui/button';
import { FormControl, FormField, FormItem, FormLabel } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Separator } from '@/shared/ui/separator';
import { RichTextEditor } from '@/shared/ui/tiptap/rich-text-editor';

export function ProfileTranslationCard({ form, index, onRemove }: any) {
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
                <Input {...field} placeholder="en, vi..." />
              </FormControl>
            </FormItem>
          )}
        />

        <Button variant="destructive" size="sm" onClick={onRemove}>
          <Trash2 className="mr-2 h-4 w-4" />
          Remove
        </Button>
      </div>

      <Separator />

      {/* Identity */}
      <Section title="Identity">
        <div className="grid gap-4 md:grid-cols-3">
          <Field
            form={form}
            name={`translations.${index}.firstName`}
            label="First Name"
          />
          <Field
            form={form}
            name={`translations.${index}.lastName`}
            label="Last Name"
          />
          <Field
            form={form}
            name={`translations.${index}.displayName`}
            label="Display Name"
          />
        </div>
      </Section>

      {/* Content */}
      <Section title="Content">
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            form={form}
            name={`translations.${index}.greeting`}
            label="Greeting"
          />
          <Field
            form={form}
            name={`translations.${index}.tagLine`}
            label="Tagline"
          />
        </div>
      </Section>

      {/* Quote */}
      <Section title="Quote">
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            form={form}
            name={`translations.${index}.quote`}
            label="Quote"
          />
          <Field
            form={form}
            name={`translations.${index}.quoteAuthor`}
            label="Author"
          />
        </div>
      </Section>

      {/* Bio */}
      <Section title="Bio">
        <FormField
          control={form.control}
          name={`translations.${index}.aboutMe`}
          render={({ field }) => (
            <RichTextEditor value={field.value} onChange={field.onChange} />
          )}
        />
      </Section>
    </div>
  );
}

function Section({ title, children }: any) {
  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs uppercase">{title}</p>
      {children}
    </div>
  );
}

function Field({ form, name, label }: any) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input {...field} value={field.value ?? ''} />
          </FormControl>
        </FormItem>
      )}
    />
  );
}
