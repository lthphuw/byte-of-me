'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { ContentState, EditorState, convertFromHTML } from 'draft-js';
import { stateToHTML } from 'draft-js-export-html';
import { useForm } from 'react-hook-form';

import { saveProfile } from '@/lib/actions/profile';
import { ProfileSchema, profileSchema } from '@/lib/schemas/profile';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { RichTextEditor } from '@/components/rich-text-editor';
import { SubmitButton } from '@/components/submit-button';

interface ProfileManagerProps {
  user: ProfileSchema & { id: string };
}

export function ProfileManager({ user }: ProfileManagerProps) {
  const { toast } = useToast();

  // ===== ABOUT ME EDITOR STATE =====
  const [about, setAbout] = useState(() => {
    if (!user.aboutMe) {
      return EditorState.createEmpty();
    }

    const blocksFromHTML = convertFromHTML(user.aboutMe);
    const contentState = ContentState.createFromBlockArray(
      blocksFromHTML.contentBlocks,
      blocksFromHTML.entityMap,
    );

    return EditorState.createWithContent(contentState);
  });

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ProfileSchema>({
    resolver: zodResolver(profileSchema),
    defaultValues: user,
  });

  const onSubmit = async (data: ProfileSchema) => {
    const res = await saveProfile({
      ...data,
      aboutMe: stateToHTML(about.getCurrentContent()),
    });

    if (res.success) {
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    } else {
      toast({
        title: 'Error',
        description: res.error,
        variant: 'destructive',
      });
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="relative space-y-10"
    >
      <fieldset disabled={isSubmitting} className="space-y-10">
        {/* ================= BASIC INFO ================= */}
        <section className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input {...register('name')} />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" {...register('email')} />
            </div>

            <div className="space-y-2">
              <Label>Phone number</Label>
              <Input {...register('phoneNumber')} />
            </div>

            <div className="space-y-2">
              <Label>Tagline</Label>
              <Input {...register('tagLine')} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Greeting</Label>
              <Input {...register('greeting')} />
            </div>
          </div>
        </section>

        {/* ================= ABOUT ================= */}
        <section className="space-y-6">
          <header>
            <h2 className="text-lg font-semibold">About</h2>
            <p className="text-sm text-muted-foreground">
              Short description and detailed introduction
            </p>
          </header>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Short bio</Label>
              <Textarea rows={3} {...register('bio')} />
            </div>

            <div className="space-y-2">
              <Label>About me</Label>
              <RichTextEditor
                editorState={about}
                onChange={setAbout}
                placeholder="Enter description..."
              />
            </div>
          </div>
        </section>

        {/* ================= QUOTE ================= */}
        <section className="space-y-6">
          <header>
            <h2 className="text-lg font-semibold">Quote</h2>
            <p className="text-sm text-muted-foreground">
              Optional quote displayed on your profile
            </p>
          </header>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Quote</Label>
              <Textarea rows={3} {...register('quote')} />
            </div>

            <div className="space-y-2">
              <Label>Author</Label>
              <Input {...register('quoteAuthor')} />
            </div>
          </div>
        </section>

        {/* ================= SOCIAL LINKS ================= */}
        <section className="space-y-6">
          <header>
            <h2 className="text-lg font-semibold">Social links</h2>
            <p className="text-sm text-muted-foreground">
              Public links visible on your profile
            </p>
          </header>

          <div className="grid gap-4 md:grid-cols-2">
            <Input placeholder="LinkedIn URL" {...register('linkedIn')} />
            <Input placeholder="GitHub URL" {...register('github')} />
            <Input placeholder="Twitter / X URL" {...register('twitter')} />
            <Input placeholder="Portfolio URL" {...register('portfolio')} />
          </div>
        </section>

        <div className="flex justify-end">
          <SubmitButton loading={isSubmitting} size="lg">
            Save changes
          </SubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
