'use client';

import { useState } from 'react';
import { type Control, useWatch } from 'react-hook-form';
import {
  Button,
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
import { SocialLinksSection } from '@/features/dashboard/manage-social-link-form';
import { useProfileController } from '@/features/dashboard/update-profile';
import { ConfirmDiscardDialog, ManagerPageHeader } from '@/shared/ui';

const FORM_ID = 'user-profile-form';

export function UserProfileManager({
  initUser,
}: {
  initUser: AdminUserProfile;
}) {
  const { form, fields, activeTab, setActiveTab, isSaving, handlers } =
    useProfileController(initUser);
  const t = useTranslations('dashboard.userProfile');
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
      {/* The form element is what lets Enter in a field submit the profile. */}
      <form id={FORM_ID} onSubmit={handlers.handleSave} className="space-y-6">
        <ManagerPageHeader
          title={t('title')}
          description={t('description')}
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={requestReset}
              className="min-h-11 gap-2 can-hover:min-h-9"
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
              className="min-h-11 gap-2 text-primary can-hover:min-h-9"
            >
              <Plus className="h-4 w-4" /> {t('translations.addLanguage')}
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 h-auto bg-muted/50 p-1">
              {fields.map((field, index) => (
                <TabsTrigger
                  key={field.id}
                  value={field.id}
                  className="min-h-11 can-hover:min-h-9"
                >
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

        {/* Action Bar: a solid fill, so the blur never has to re-sample the scroll. */}
        <div className="sticky bottom-6 ml-auto flex w-fit justify-end gap-3 rounded-2xl border bg-background p-4 shadow-2xl">
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 can-hover:min-h-9"
            onClick={requestReset}
          >
            {t('cancelButton')}
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
            className="min-h-11 min-w-[140px] can-hover:min-h-9"
          >
            {isSaving && (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            )}
            {t('saveButton')}
          </Button>
        </div>
      </form>

      <ConfirmDiscardDialog
        open={confirmingReset}
        onOpenChange={setConfirmingReset}
        onDiscard={() => {
          setConfirmingReset(false);
          handlers.handleReset();
        }}
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
