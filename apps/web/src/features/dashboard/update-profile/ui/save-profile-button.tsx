'use client';

import { useFormContext } from 'react-hook-form';
import { saveProfile } from '@/entities/user-profile/api/save-profile';
import type { UserProfileFormValues } from '@/entities/user-profile/model/user-profile-schema';
import { useToast } from '@/shared/hooks/use-toast';
import { Button } from '@/shared/ui/button';
import { Icons } from '@/shared/ui/icons';

import { useMutation, useQueryClient } from '@tanstack/react-query';

export function SaveProfileButton({ userId }: { userId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { handleSubmit } = useFormContext<UserProfileFormValues>();

  const mutation = useMutation({
    mutationFn: saveProfile,
    onSuccess: () => {
      toast({ title: 'Saved successfully' });
      queryClient.invalidateQueries({
        queryKey: ['userProfileSchema', userId],
      });
    },
    onError: (err: any) => {
      toast({
        title: 'Error saving profile',
        description: err?.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (values: UserProfileFormValues) => {
    mutation.mutate({
      ...values,
      translations: values.translations.map((t) => ({
        ...t,
        aboutMe:
          typeof t.aboutMe === 'string' ? t.aboutMe : JSON.stringify(t.aboutMe),
      })),
      socialLinks: values.socialLinks.map((s, i) => ({ ...s, sortOrder: i })),
    });
  };

  return (
    <Button onClick={handleSubmit(onSubmit)} disabled={mutation.isPending}>
      {mutation.isPending && (
        <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
      )}
      Save Profile
    </Button>
  );
}
