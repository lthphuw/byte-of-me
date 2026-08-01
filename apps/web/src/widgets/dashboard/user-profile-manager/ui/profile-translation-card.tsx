'use client';

import type { Control, Path, UseFormReturn } from 'react-hook-form';
import {
  DeleteButton,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  Input,
  Separator,
  Textarea,
} from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

import { uploadSingleMedia } from '@/entities/media';
import type { UserProfileFormValues } from '@/entities/user-profile';
import { LazyRichTextEditor as RichTextEditor } from '@/shared/ui/lazy-rich-text-editor';

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
  const t = useTranslations('dashboard.userProfile');

  return (
    <div className="space-y-6 rounded-xl border bg-background/50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <FormField
          control={form.control}
          name={`translations.${index}.language`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('translations.languageLabel')}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={t('translations.languagePlaceholder')}
                  className="w-32"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <DeleteButton onClick={onRemove}/>
      </div>

      <Separator />

      {/* Identity */}
      <Section title={t('identity.sectionTitle')}>
        <div className="grid gap-4 md:grid-cols-3">
          <Field
            control={form.control}
            name={`translations.${index}.firstName`}
            label={t('identity.firstNameLabel')}
          />
          <Field
            control={form.control}
            name={`translations.${index}.lastName`}
            label={t('identity.lastNameLabel')}
          />
          <Field
            control={form.control}
            name={`translations.${index}.displayName`}
            label={t('identity.displayNameLabel')}
          />
        </div>
      </Section>

      {/* Content */}
      <Section title={t('content.sectionTitle')}>
        <div className="grid gap-4 md:grid-cols-1">
          <Field
            control={form.control}
            name={`translations.${index}.greeting`}
            label={t('content.greetingLabel')}
          />

          <FormField
            control={form.control}
            name={`translations.${index}.tagLine`}
            render={({ field }) => (
              <FormItem >
                <FormLabel>{t('content.taglineLabel')}</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ''}
                    className="min-h-[80px] resize-none"
                    placeholder={t('content.taglinePlaceholder')}
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
                <FormLabel>{t('content.bioLabel')}</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ''}
                    className="min-h-[80px] resize-none"
                    placeholder={t('content.bioPlaceholder')}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </Section>

      {/* Quote */}
      <Section title={t('quote.sectionTitle')}>
        <div className="grid gap-4">
          <FormField
            control={form.control}
            name={`translations.${index}.quote`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('quote.quoteLabel')}</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ''}
                    className="min-h-[80px] resize-none"
                    placeholder={t('quote.quotePlaceholder')}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <Field
            control={form.control}
            name={`translations.${index}.quoteAuthor`}
            label={t('quote.authorLabel')}
          />
        </div>
      </Section>

      {/* About Me (Rich Text) */}
      <Section title={t('aboutMe.sectionTitle')}>
        <FormField
          control={form.control}
          name={`translations.${index}.aboutMe`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <RichTextEditor
                  value={field.value}
                  onChange={field.onChange}
                  uploadImage={uploadSingleMedia}
                />
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
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

interface FieldProps {
  control: Control<UserProfileFormValues>;
  name: Path<UserProfileFormValues>;
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
