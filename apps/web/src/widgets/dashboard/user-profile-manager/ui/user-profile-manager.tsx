'use client';

import { useState } from 'react';
import { type Control, useWatch } from 'react-hook-form';
import {
  Button,
  ConfirmDeleteDialog,
  Form,
  Icons,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@byte-of-me/ui';
import { Globe2, Plus, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ProfileTranslationCard } from './profile-translation-card';
import { UserProfileSectionManager } from './user-profile-section-manager';

import type {
  AdminUserProfile,
  UserProfileFormValues,
} from '@/entities/user-profile';
import { SocialLinksSection } from '@/features/dashboard/manage-social-link-form/ui';
import { useProfileController } from '@/features/dashboard/update-profile/lib/use-profile-controller';
import { ManagerPageHeader } from '@/shared/ui';

export function UserProfileManager({
  initUser,
}: {
  initUser: AdminUserProfile;
}) {
  const { form, fields, activeTab, setActiveTab, isSaving, handlers } =
    useProfileController(initUser);
  const t = useTranslations('dashboard.userProfile');
  const tShared = useTranslations('dashboard.shared');
  const [confirmingReset, setConfirmingReset] = useState(false);

  // Reset throws away every unsaved edit across every language, so it asks
  // first — but only once there is something to lose.
  const isDirty = form.formState.isDirty;
  const requestReset = () => {
    if (isDirty) setConfirmingReset(true);
    else handlers.handleReset();
  };

  return (
    <Form {...form}>
      <ManagerPageHeader
        title={t('title')}
        description={t('description')}
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={requestReset}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" /> {t('resetButton')}
          </Button>
        }
      />

      {/* Translations */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Globe2 className="h-4 w-4" /> {t('translations.heading')}
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handlers.addLanguage}
            className="gap-2 text-primary"
          >
            <Plus className="h-4 w-4" /> {t('translations.addLanguage')}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 bg-muted/50 p-1">
            {fields.map((field, index) => (
              <TabsTrigger key={field.id} value={field.id}>
                <TranslationTabLabel control={form.control} index={index} />
              </TabsTrigger>
            ))}
          </TabsList>

          {fields.map((field, index) => (
            <TabsContent key={field.id} value={field.id}>
              <ProfileTranslationCard
                form={form}
                index={index}
                onRemove={() => handlers.removeLanguage(index)}
              />
            </TabsContent>
          ))}
        </Tabs>
      </section>

      <UserProfileSectionManager form={form} />
      <SocialLinksSection form={form} />

      {/* Action Bar */}
      <div className="sticky bottom-6 ml-auto flex w-fit justify-end gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur-xl">
        <Button type="button" variant="ghost" onClick={requestReset}>
          {t('cancelButton')}
        </Button>
        <Button
          onClick={handlers.handleSave}
          disabled={isSaving}
          className="min-w-[140px]"
        >
          {isSaving && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
          {t('saveButton')}
        </Button>
      </div>

      <ConfirmDeleteDialog
        isOpen={confirmingReset}
        onClose={() => setConfirmingReset(false)}
        onConfirm={() => {
          setConfirmingReset(false);
          handlers.handleReset();
        }}
        title={t('reset.confirmTitle')}
        description={t('reset.confirmDescription')}
        actionText={t('reset.confirmAction')}
        cancelText={tShared('confirmDelete.cancelText')}
      />
    </Form>
  );
}

/**
 * The language code alone, subscribed in its own leaf. Watching it from the
 * root render (`form.watch`) re-rendered this whole page — every translation
 * card and its lazily-loaded editor — on every keystroke in any field.
 */
function TranslationTabLabel({
  control,
  index,
}: {
  control: Control<UserProfileFormValues>;
  index: number;
}) {
  const t = useTranslations('dashboard.userProfile');
  const language = useWatch({
    control,
    name: `translations.${index}.language`,
  });

  return <>{language?.toUpperCase() || t('translations.newTabLabel')}</>;
}
