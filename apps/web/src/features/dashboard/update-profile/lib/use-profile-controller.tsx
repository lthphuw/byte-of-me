'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import type { AdminUserProfile } from '@/entities/user-profile';
import { getAdminUserProfile } from '@/entities/user-profile/api/get-user-profile-with-translations';
import { saveProfile } from '@/entities/user-profile/api/save-profile';
import { userProfileKeys } from '@/entities/user-profile/model/query-keys';
import {
  createUserProfileSchema,
  type UserProfileFormValues,
} from '@/entities/user-profile/model/user-profile-schema';
import { firstErroredIndex } from '@/shared/ui';

export function useProfileController(initUser: AdminUserProfile) {
  const t = useTranslations('dashboard.userProfile');
  const tValidation = useTranslations('dashboard.userProfile.validation');
  const tShared = useTranslations('dashboard.shared');
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>('');

  const {
    data: user,
    isError,
    error,
  } = useQuery({
    queryKey: userProfileKeys.profile(initUser.id),
    // getAdminUserProfile resolves (never throws) with an ApiResponse — unwrap
    // it so a failure sets `isError` instead of yielding `{ success: false }`,
    // whose missing `data` left `user` undefined and the screen blank.
    queryFn: async () => {
      const res = await getAdminUserProfile();
      if (!res.success) {
        throw new Error(res.errorMsg);
      }
      return res.data;
    },
    initialData: initUser,
  });

  // A failed refetch is otherwise silent: TanStack keeps the last good profile
  // on screen, so nothing about the form says it is now out of date.
  useEffect(() => {
    if (isError) {
      toast.error(tShared('managerListState.errorTitle'), {
        description: error?.message,
      });
    }
  }, [isError, error, tShared]);

  // The schema carries message *keys*; the locale is only knowable here, since
  // the entity is also parsed server-side and cannot call next-intl.
  const schema = useMemo(
    () => createUserProfileSchema((key) => tValidation(key)),
    [tValidation]
  );

  const form = useForm<UserProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { birthdate: null, socialLinks: [], translations: [] },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'translations',
  });

  const saveMutation = useMutation({
    // saveProfile resolves (never throws) with an ApiResponse — unwrap it so
    // a { success: false } result reaches onError instead of onSuccess.
    mutationFn: async (values: Parameters<typeof saveProfile>[0]) => {
      const res = await saveProfile(values);
      if (!res.success) {
        throw new Error(res.errorMsg);
      }
      return res.data;
    },
    onSuccess: () => {
      toast(t('toast.updated'));
      queryClient.invalidateQueries({
        queryKey: userProfileKeys.profile(initUser.id),
      });
    },
    onError: (err) => {
      toast.error(t('toast.saveError'), {
        description: err?.message,
      });
    },
  });

  const parseAboutMe = useCallback((content: unknown) => {
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
          userData.userProfile?.translations?.map((t) => ({
            ...t,
            aboutMe: parseAboutMe(t.aboutMe),
          })) || [],
      });
    },
    [form, parseAboutMe]
  );

  // Seed once per profile, not on every `user` identity: with the global 60s
  // staleTime and refetchOnWindowFocus, returning to the tab refetches, and an
  // unconditional reset would throw away everything typed since. Keyed on the
  // id (as `blog-form.tsx` does) rather than gated on `isDirty`, because a
  // reset while pristine is just as unwanted mid-edit.
  const seededProfileId = useRef<Nullable<string>>(null);

  useEffect(() => {
    if (!user || seededProfileId.current === user.id) return;
    seededProfileId.current = user.id;
    resetForm(user);
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
  const handleSave = form.handleSubmit(
    (values) => {
      const payload = {
        ...values,
        translations: values.translations.map((t) => ({
          ...t,
          aboutMe:
            typeof t.aboutMe === 'string'
              ? t.aboutMe
              : JSON.stringify(t.aboutMe),
        })),
        socialLinks: values.socialLinks.map((s, i) => ({ ...s, sortOrder: i })),
      };
      saveMutation.mutate(payload);
    },
    // A translation error otherwise renders inside an unmounted tab: Save
    // just appears to do nothing.
    (errors) => {
      const index = firstErroredIndex(errors.translations);
      const id = index === null ? undefined : fields[index]?.id;
      if (id) setActiveTab(id);
    }
  );

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
