'use client';

import { useEffect, useState } from 'react';
import { AdminUserProfile } from '@/entities/user-profile';
import { getAdminUserProfile } from '@/entities/user-profile/api/get-user-profile-with-translations';
import { saveProfile } from '@/entities/user-profile/api/save-profile';
import {
  ProfileFormValues,
  userProfileSchema,
} from '@/entities/user-profile/schemas/user-profile';
import { Button } from '@/shared/ui/button';
import { Form } from '@/shared/ui/form';
import { Icons } from '@/shared/ui/icons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { useToast } from '@/shared/ui/use-toast';
import { SocialLinksSection } from '@/widgets/user-profile-manager/social-link-section-manager';
import { UserProfileSectionManager } from '@/widgets/user-profile-manager/ui/user-profile-section-manager';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Globe2, Languages, Plus, RotateCcw } from 'lucide-react';
import { useFieldArray, useForm } from 'react-hook-form';

import { ProfileTranslationCard } from './profile-translation-card';

export function ProfileManager({ initUser }: { initUser: AdminUserProfile }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>();

  const { data } = useQuery({
    queryKey: ['userProfileSchema', initUser.id],
    queryFn: getAdminUserProfile,
    initialData: { success: true, data: initUser },
  });

  const user = data?.data;

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: { socialLinks: [], translations: [] },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'translations',
  });

  const mutation = useMutation({
    mutationFn: saveProfile,
    onSuccess: () => {
      toast({ title: 'Saved' });
      queryClient.invalidateQueries({
        queryKey: ['userProfileSchema', initUser.id],
      });
    },
    onError: (err: any) => {
      toast({
        title: 'Error',
        description: err?.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (values: ProfileFormValues) => {
    mutation.mutate({
      ...values,
      translations: values.translations.map((t) => ({
        ...t,
        aboutMe: t.aboutMe ? JSON.stringify(t.aboutMe) : '<p></p>',
      })),
      socialLinks: values.socialLinks.map((s, i) => ({ ...s, sortOrder: i })),
    });
  };

  const handleReset = () => {
    if (!user) return;

    form.reset({
      birthdate: user.userProfile?.birthdate,
      socialLinks: user.socialLinks ?? [],
      translations:
        user.userProfile?.translations?.map((t: any) => ({
          ...t,
          aboutMe: t.aboutMe ? JSON.parse(t.aboutMe) : '<p></p>',
        })) || [],
    });

    toast({ title: 'Reset' });
  };

  useEffect(() => {
    if (!user) return;

    form.reset({
      birthdate: user.userProfile?.birthdate,
      socialLinks: user.socialLinks ?? [],
      translations:
        user.userProfile?.translations?.map((t: any) => ({
          ...t,
          aboutMe: t.aboutMe ? JSON.parse(t.aboutMe) : '<p></p>',
        })) || [],
    });
  }, [user]);

  useEffect(() => {
    if (fields.length > 0) setActiveTab(fields[0].id);
  }, [fields]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="max-w-4xl mx-auto space-y-10 pb-24"
      >
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">Profile Settings</h2>
            <p className="text-sm text-muted-foreground">
              Manage your profile content and languages
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>

        {/* Translations */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Globe2 className="w-4 h-4" />
              <span className="text-sm font-medium">Translations</span>
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                append({
                  language: '',
                  displayName: '',
                  aboutMe: null,
                })
              }
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Language <Languages />
            </Button>
          </div>

          {fields.length === 0 ? (
            <div className="text-center border rounded-lg py-10">
              <p className="text-sm text-muted-foreground mb-3">
                No translations yet
              </p>
              <Button
                onClick={() => {
                  append({
                    language: '',
                    displayName: '',
                  });
                }}
              >
                Add your first language
              </Button>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                {fields.map((field, index) => {
                  const lang = form.watch(`translations.${index}.language`);
                  const name = form.watch(`translations.${index}.displayName`);

                  return (
                    <TabsTrigger key={field.id} value={field.id}>
                      {lang
                        ? `${lang.toUpperCase()} • ${name || '...'}`
                        : 'New'}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {fields.map((field, index) => (
                <TabsContent key={field.id} value={field.id}>
                  <ProfileTranslationCard
                    form={form}
                    index={index}
                    onRemove={() => remove(index)}
                  />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>

        <UserProfileSectionManager form={form} />
        <SocialLinksSection form={form} />

        {/* Sticky Footer */}
        <div className="fixed bottom-0 left-0 right-0 p-8 flex justify-end gap-2">
          <Button variant="ghost" onClick={handleReset}>
            Reset
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            )}{' '}
            Save
          </Button>
        </div>
      </form>
    </Form>
  );
}
