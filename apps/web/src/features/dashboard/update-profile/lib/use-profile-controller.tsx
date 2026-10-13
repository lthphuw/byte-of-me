'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { rebaseAfterSave, toProfileFormValues } from './profile-form-state';

import {
  type AdminUserProfile,
  createUserProfileSchema,
  saveProfile,
  type UserProfileFormValues,
  userProfileKeys,
} from '@/entities/user-profile';
import { useUserProfile } from '@/entities/user-profile/query';
import { useServerMutation } from '@/shared/hooks/use-server-mutation';
import { firstErroredIndex } from '@/shared/ui';

export function useProfileController(initUser: AdminUserProfile) {
  const t = useTranslations('dashboard.userProfile');
  const tValidation = useTranslations('dashboard.userProfile.validation');
  const tShared = useTranslations('dashboard.shared');
  const [activeTab, setActiveTab] = useState<string>('');

  const { data: user, isError, error, refetch } = useUserProfile(initUser);

  // A failed refetch is otherwise silent: TanStack keeps the last good profile
  // on screen, so nothing about the form says it is now out of date. The form
  // stays up, and the toast offers Retry.
  useEffect(() => {
    if (!isError) return;
    console.error(error);
    toast.error(t('toast.loadError'), {
      action: {
        label: tShared('managerListState.retry'),
        onClick: () => void refetch(),
      },
    });
  }, [isError, error, refetch, t, tShared]);

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

  const saveMutation = useServerMutation({
    mutationFn: saveProfile,
    errorMessage: t('toast.saveError'),
    successMessage: t('toast.updated'),
    invalidate: [userProfileKeys.all],
  });

  const resetForm = useCallback(
    (userData: AdminUserProfile) => {
      form.reset(toProfileFormValues(userData));
    },
    [form]
  );

  // Seed once per profile, not on every `user` identity: a refetch (the
  // invalidation after a save, a reconnect) hands back a fresh object, and an
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
        socialLinks: values.socialLinks.map((s, i) => ({ ...s, sortOrder: i })),
      };
      saveMutation.mutate(payload, {
        // The saved values become the baseline, so the form is no longer dirty.
        // `keepValues` keeps anything typed while the save was in flight.
        onSuccess: () => rebaseAfterSave(form, values),
      });
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
