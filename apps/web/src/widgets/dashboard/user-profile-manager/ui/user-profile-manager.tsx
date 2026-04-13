'use client';

import { useCallback, useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import type { AdminUserProfile } from '@/entities/user-profile';
import { getAdminUserProfile } from '@/entities/user-profile/api/get-user-profile-with-translations';
import {
  type ProfileFormValues,
  userProfileSchema,
} from '@/entities/user-profile/model/user-profile-schema';
import { SocialLinksSection } from '@/features/dashboard/manage-social-link-form/ui';
import { SaveProfileButton } from '@/features/dashboard/update-profile/ui';
import { useToast } from '@/shared/hooks/use-toast';
import { Button } from '@/shared/ui/button';
import { Form } from '@/shared/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Globe2, Languages, Plus, RotateCcw } from 'lucide-react';

import { ProfileTranslationCard } from './profile-translation-card';
import { UserProfileSectionManager } from './user-profile-section-manager';

export function UserProfileManager({
  initUser,
}: {
  initUser: AdminUserProfile;
}) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>('');

  const { data } = useQuery({
    queryKey: ['userProfileSchema', initUser.id],
    queryFn: getAdminUserProfile,
    initialData: { success: true, data: initUser },
  });

  const user = data?.data;

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: { birthdate: null, socialLinks: [], translations: [] },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'translations',
  });

  const parseAboutMe = useCallback((content: any) => {
    if (!content || content === '<p></p>') return '<p></p>';
    if (typeof content !== 'string') return content;
    try {
      return content.startsWith('{') || content.startsWith('[')
        ? JSON.parse(content)
        : content;
    } catch {
      return content;
    }
  }, []);

  const performReset = useCallback(
    (userData: any) => {
      if (!userData) return;
      form.reset({
        birthdate: userData.userProfile?.birthdate
          ? new Date(userData.userProfile.birthdate)
          : null,
        socialLinks: userData.socialLinks ?? [],
        translations:
          userData.userProfile?.translations?.map((t: any) => ({
            ...t,
            aboutMe: parseAboutMe(t.aboutMe),
          })) || [],
      });
    },
    [form, parseAboutMe]
  );

  const handleManualReset = () => {
    performReset(user);
    toast({ title: 'Form reset' });
  };

  // 1. Initial Data Sync: Only run when the query data actually changes
  useEffect(() => {
    if (user) {
      performReset(user);
    }
  }, [user, performReset]);

  // 2. Tab Management: Auto-select first tab when fields are populated
  useEffect(() => {
    if (fields.length > 0) {
      // If activeTab is empty or current activeTab ID isn't in the new fields list
      const isTabStillValid = fields.some((f) => f.id === activeTab);
      if (!activeTab || !isTabStillValid) {
        setActiveTab(fields[0].id);
      }
    } else {
      setActiveTab('');
    }
  }, [fields, activeTab]);

  const addNewLanguage = () => {
    const id = crypto.randomUUID(); // Optional: helper to focus
    append({
      language: '',
      displayName: '',
      firstName: '',
      lastName: '',
      greeting: '',
      tagLine: '',
      bio: '',
      quote: '',
      quoteAuthor: '',
      aboutMe: '<p></p>',
    });
  };

  return (
    <Form {...form}>
      <div className="mx-auto max-w-4xl space-y-10 pb-24">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Profile Settings</h2>
            <p className="text-muted-foreground text-sm">
              Manage profile and languages
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleManualReset}
          >
            <RotateCcw className="mr-2 h-4 w-4" /> Reset
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
              <Globe2 className="h-4 w-4" /> Translations
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addNewLanguage}
            >
              <Plus className="mr-1 h-4 w-4" /> Add Language{' '}
              <Languages className="ml-1 h-4 w-4" />
            </Button>
          </div>

          {fields.length === 0 ? (
            <div className="rounded-lg border py-10 text-center">
              <Button type="button" onClick={addNewLanguage}>
                Add first language
              </Button>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="max-w-full overflow-x-auto">
                {fields.map((field, index) => (
                  <TabsTrigger key={field.id} value={field.id}>
                    {form
                      .watch(`translations.${index}.language`)
                      ?.toUpperCase() || 'New'}
                  </TabsTrigger>
                ))}
              </TabsList>
              {fields.map((field, index) => (
                <TabsContent key={field.id} value={field.id}>
                  <ProfileTranslationCard
                    form={form}
                    index={index}
                    onRemove={() => {
                      remove(index);
                    }}
                  />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>

        <UserProfileSectionManager form={form} />
        <SocialLinksSection form={form} />

        <div className="flex justify-end gap-2 border-t p-8 backdrop-blur-md">
          <Button type="button" variant="ghost" onClick={handleManualReset}>
            Reset
          </Button>
          <SaveProfileButton userId={initUser.id} />
        </div>
      </div>
    </Form>
  );
}
