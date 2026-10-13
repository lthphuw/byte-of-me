/**
 * Defends the dirty flag that Reset reads: a saved profile is clean, a padded URL
 * saves trimmed and clean, and a value typed mid-save stays dirty.
 */
import { useFieldArray, useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'bun:test';

import { rebaseAfterSave, toProfileFormValues } from './profile-form-state';

import type { AdminUserProfile } from '@/entities/user-profile/model/types';
import {
  type UserProfileFormValues,
  userProfileSchema,
} from '@/entities/user-profile/model/user-profile-schema';

const date = new Date('2026-01-01T00:00:00.000Z');

/** A profile as getAdminUserProfile returns it, with every column the form does not carry. */
const loaded: AdminUserProfile = {
  id: 'user-1',
  createdAt: date,
  updatedAt: date,
  role: 'USER',
  email: 'owner@example.com',
  name: null,
  image: null,
  emailVerified: null,
  userProfile: {
    id: 'profile-1',
    createdAt: date,
    updatedAt: date,
    birthdate: new Date('1990-05-01T00:00:00.000Z'),
    userId: 'user-1',
    translations: [
      {
        id: 'translation-en',
        language: 'en',
        displayName: 'Ada',
        firstName: 'Ada',
        middleName: null,
        lastName: 'Lovelace',
        greeting: 'Hello',
        tagLine: null,
        quote: null,
        quoteAuthor: null,
        bio: null,
        aboutMe: JSON.stringify({
          type: 'doc',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'Hi' }] },
          ],
        }),
      },
    ],
  },
  socialLinks: [
    {
      id: 'link-github',
      createdAt: date,
      updatedAt: date,
      platform: 'github',
      url: 'https://github.com/example',
      sortOrder: 0,
      userId: 'user-1',
    },
  ],
};

type Form = UseFormReturn<UserProfileFormValues>;

/** Mounts a form the way the controller does: the same schema, and both field arrays. */
function mountForm() {
  return renderHook(() => {
    const form = useForm<UserProfileFormValues>({
      resolver: zodResolver(userProfileSchema),
      defaultValues: { birthdate: null, socialLinks: [], translations: [] },
    });
    useFieldArray({ control: form.control, name: 'translations' });
    useFieldArray({ control: form.control, name: 'socialLinks' });
    return { form, isDirty: form.formState.isDirty };
  });
}

/** Submits as the controller does, and returns the values its save would send. */
async function submit(form: Form): Promise<UserProfileFormValues> {
  let saved: UserProfileFormValues | undefined;
  await act(async () => {
    await form.handleSubmit((values) => {
      saved = values;
    })();
  });
  if (!saved) throw new Error('the form did not pass validation');
  return saved;
}

afterEach(cleanup);

describe('profile form state after a save', () => {
  it('is not dirty after an untouched save', async () => {
    const { result } = mountForm();
    act(() => result.current.form.reset(toProfileFormValues(loaded)));

    const saved = await submit(result.current.form);
    act(() => rebaseAfterSave(result.current.form, saved));

    expect(result.current.isDirty).toBe(false);
  });

  it('saves a social link URL typed with spaces trimmed, and is not dirty', async () => {
    const { result } = mountForm();
    act(() => {
      result.current.form.reset(toProfileFormValues(loaded));
      result.current.form.setValue(
        'socialLinks.0.url',
        '  https://github.com/example  ',
        { shouldDirty: true }
      );
    });

    const saved = await submit(result.current.form);
    expect(saved.socialLinks[0]?.url).toBe('https://github.com/example');

    act(() => rebaseAfterSave(result.current.form, saved));
    expect(result.current.form.getValues('socialLinks.0.url')).toBe(
      'https://github.com/example'
    );
    expect(result.current.isDirty).toBe(false);
  });

  it('keeps a URL edited while the save was in flight, and stays dirty', async () => {
    const { result } = mountForm();
    act(() => result.current.form.reset(toProfileFormValues(loaded)));
    const saved = await submit(result.current.form);

    act(() => {
      result.current.form.setValue(
        'socialLinks.0.url',
        'https://example.com/other',
        { shouldDirty: true }
      );
      rebaseAfterSave(result.current.form, saved);
    });

    expect(result.current.form.getValues('socialLinks.0.url')).toBe(
      'https://example.com/other'
    );
    expect(result.current.isDirty).toBe(true);
  });
});
