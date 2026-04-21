'use client';

import { useCallback, useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { AdminUserProfile } from '@/entities/user-profile';
import { getAdminUserProfile } from '@/entities/user-profile/api/get-user-profile-with-translations';
import { saveProfile } from '@/entities/user-profile/api/save-profile';
import {
  type UserProfileFormValues,
  userProfileSchema,
} from '@/entities/user-profile/model/user-profile-schema';
import { useToast } from '@/shared/hooks/use-toast';

export function useProfileController(initUser: AdminUserProfile) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>('');

  const { data: response } = useQuery({
    queryKey: ['userProfileSchema', initUser.id],
    queryFn: getAdminUserProfile,
    initialData: { success: true, data: initUser },
  });

  const user = response?.data;

  const form = useForm<UserProfileFormValues>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: { birthdate: null, socialLinks: [], translations: [] },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'translations',
  });

  const saveMutation = useMutation({
    mutationFn: saveProfile,
    onSuccess: () => {
      toast({ title: 'Profile synchronized' });
      queryClient.invalidateQueries({
        queryKey: ['userProfileSchema', initUser.id],
      });
    },
    onError: (err: Any) => {
      toast({
        title: 'Save failed',
        description: err?.message,
        variant: 'destructive',
      });
    },
  });

  const parseAboutMe = useCallback((content: Any) => {
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

  const resetForm = useCallback(
    (userData: AdminUserProfile) => {
      form.reset({
        birthdate: userData.userProfile?.birthdate
          ? new Date(userData.userProfile.birthdate)
          : null,
        socialLinks: userData.socialLinks ?? [],
        translations:
          userData.userProfile?.translations?.map((t: Any) => ({
            ...t,
            aboutMe: parseAboutMe(t.aboutMe),
          })) || [],
      });
    },
    [form, parseAboutMe]
  );

  useEffect(() => {
    if (user) resetForm(user);
  }, [user, resetForm]);

  // Tab Sync
  useEffect(() => {
    if (fields.length > 0) {
      const isValid = fields.some((f) => f.id === activeTab);
      if (!activeTab || !isValid) setActiveTab(fields[0].id);
    } else {
      setActiveTab('');
    }
  }, [fields, activeTab]);

  // 5. Handlers
  const handleSave = form.handleSubmit((values) => {
    const payload = {
      ...values,
      translations: values.translations.map((t) => ({
        ...t,
        aboutMe:
          typeof t.aboutMe === 'string' ? t.aboutMe : JSON.stringify(t.aboutMe),
      })),
      socialLinks: values.socialLinks.map((s, i) => ({ ...s, sortOrder: i })),
    };
    saveMutation.mutate(payload);
  });

  return {
    form,
    fields,
    activeTab,
    setActiveTab,
    isSaving: saveMutation.isPending,
    handlers: {
      handleSave,
      handleReset: () => user && resetForm(user),
      addLanguage: () =>
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
        }),
      removeLanguage: remove,
    },
  };
}
