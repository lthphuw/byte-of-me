'use client';

import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { UserProfileFormValues } from '@byte-of-me/contracts/user-profile';
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

import { useScopedImageUploader } from '@/entities/media/query';
import { ConfirmDeleteDialog, FieldMessage, TextField } from '@/shared/ui';
import { LazyRichTextEditor as RichTextEditor } from '@/shared/ui/lazy-rich-text-editor';

/** The editor's empty document, which is what an untouched "About me" holds. */
function hasRichText(value: unknown): boolean {
  if (!value) return false;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed !== '' && trimmed !== '<p></p>';
  }
  return true;
}

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
  // Images pasted into this editor land under the `profile` prefix in storage.
  const uploadImage = useScopedImageUploader('profile');
  const t = useTranslations('dashboard.userProfile');
  const tMedia = useTranslations('dashboard.media');
  // Holds the language code being confirmed — nothing here subscribes to the
  // form, so the label has to be captured at click time to be current.
  const [confirmingLanguage, setConfirmingLanguage] = useState<string | null>(
    null
  );

  // Removing a language drops its name, bio, quote and whole "About me" document at once.
  // `getValues`, not a watch: it only has to be right at click time, and a subscription would
  // re-render the card and its editor on every keystroke.
  const handleRemove = () => {
    const values = form.getValues(`translations.${index}`);
    const hasContent =
      [
        values?.firstName,
        values?.lastName,
        values?.displayName,
        values?.greeting,
        values?.tagLine,
        values?.bio,
        values?.quote,
        values?.quoteAuthor,
      ].some((value) => Boolean(value?.trim())) || hasRichText(values?.aboutMe);

    if (hasContent) setConfirmingLanguage(values?.language ?? '');
    else onRemove();
  };

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
              <FieldMessage />
            </FormItem>
          )}
        />

        <DeleteButton
          label={t('translations.removeLanguageLabel')}
          onClick={handleRemove}
        />
      </div>

      <Separator />

      {/* Identity */}
      <Section title={t('identity.sectionTitle')}>
        <div className="grid gap-4 md:grid-cols-3">
          <TextField
            control={form.control}
            name={`translations.${index}.firstName`}
            label={t('identity.firstNameLabel')}
          />
          <TextField
            control={form.control}
            name={`translations.${index}.lastName`}
            label={t('identity.lastNameLabel')}
          />
          <TextField
            control={form.control}
            name={`translations.${index}.displayName`}
            label={t('identity.displayNameLabel')}
          />
        </div>
      </Section>

      {/* Content */}
      <Section title={t('content.sectionTitle')}>
        <div className="grid gap-4 md:grid-cols-1">
          <TextField
            control={form.control}
            name={`translations.${index}.greeting`}
            label={t('content.greetingLabel')}
          />

          <FormField
            control={form.control}
            name={`translations.${index}.tagLine`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('content.taglineLabel')}</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ''}
                    className="min-h-[80px] resize-none"
                    placeholder={t('content.taglinePlaceholder')}
                  />
                </FormControl>
                <FieldMessage />
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
                <FieldMessage />
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
                <FieldMessage />
              </FormItem>
            )}
          />
          <TextField
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
                  uploadImage={uploadImage}
                  uploadFailedText={tMedia('toast.uploadError')}
                />
              </FormControl>
              <FieldMessage />
            </FormItem>
          )}
        />
      </Section>

      <ConfirmDeleteDialog
        open={confirmingLanguage !== null}
        onClose={() => setConfirmingLanguage(null)}
        onConfirm={() => {
          setConfirmingLanguage(null);
          onRemove();
        }}
        title={t('translations.removeConfirmTitle')}
        description={t('translations.removeConfirmDescription', {
          language:
            confirmingLanguage?.toUpperCase() || t('translations.newTabLabel'),
        })}
      />
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
