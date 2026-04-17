'use client';

import { Globe2, Plus, RotateCcw } from 'lucide-react';

import { ProfileTranslationCard } from './profile-translation-card';
import { UserProfileSectionManager } from './user-profile-section-manager';

import type { AdminUserProfile } from '@/entities/user-profile';
import { SocialLinksSection } from '@/features/dashboard/manage-social-link-form/ui';
import { useProfileController } from '@/features/dashboard/update-profile/lib/use-profile-controller';
import { Button } from '@/shared/ui/button';
import { Form } from '@/shared/ui/form';
import { Icons } from '@/shared/ui/icons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';

export function UserProfileManager({
  initUser,
}: {
  initUser: AdminUserProfile;
}) {
  const { form, fields, activeTab, setActiveTab, isSaving, handlers } =
    useProfileController(initUser);

  return (
    <Form {...form}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Profile Settings
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage your global identity.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handlers.handleReset}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" /> Reset
        </Button>
      </div>

      {/* Translations */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Globe2 className="h-4 w-4" /> Translations
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handlers.addLanguage}
            className="gap-2 text-primary"
          >
            <Plus className="h-4 w-4" /> Add Language
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 bg-muted/50 p-1">
            {fields.map((field, index) => (
              <TabsTrigger key={field.id} value={field.id}>
                {form.watch(`translations.${index}.language`)?.toUpperCase() ||
                  'NEW'}
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
        <Button type="button" variant="ghost" onClick={handlers.handleReset}>
          Cancel
        </Button>
        <Button
          onClick={handlers.handleSave}
          disabled={isSaving}
          className="min-w-[140px]"
        >
          {isSaving && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
          Save
        </Button>
      </div>
    </Form>
  );
}
