'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { saveProfile } from '@/lib/actions/profile';
import { FileHelper } from '@/lib/core/file-helper';
import { profileSchema } from '@/lib/validations/profile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';





type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  user: ProfileFormValues & { id: string };
}

export function ProfileForm({ user }: ProfileFormProps) {
  const { toast } = useToast();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: user,
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // When user selects image
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarFile(file);

    try {
      const base64 = await FileHelper.fileToBase64(file);
      form.setValue('image', base64, { shouldDirty: true });
      toast({ title: 'Avatar updated (not saved yet)' });
    } catch (err: any) {
      toast({
        title: `Failed to load image: ${err.message}`,
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: ProfileFormValues) => {
    const res = await saveProfile(data);
    if (res.success) {
      toast({ title: 'Success', description: 'Profile updated successfully!' });
    } else {
      toast({ title: 'Error', description: res.error, variant: 'destructive' });
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      {/* Avatar Upload */}
      <div className="flex items-center gap-6">
        <Avatar className="h-24 w-24">
          <AvatarImage
            src={
              avatarFile
                ? URL.createObjectURL(avatarFile) // instant preview
                : form.watch('image') || user.image || ''
            }
          />
          <AvatarFallback>{user.name?.[0] || 'U'}</AvatarFallback>
        </Avatar>

        <div className="space-y-1">
          <Label htmlFor="avatar">Avatar</Label>
          <Input
            id="avatar"
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
          />
        </div>
      </div>

      {/* Basic Info */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Full Name</Label>
          <Input {...form.register('name')} />
        </div>

        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" {...form.register('email')} />
        </div>

        <div className="space-y-2">
          <Label>Phone Number</Label>
          <Input {...form.register('phoneNumber')} />
        </div>

        <div className="space-y-2">
          <Label>Tagline</Label>
          <Input
            placeholder="Full-stack Developer | Open Source Lover"
            {...form.register('tagLine')}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Greeting</Label>
          <Input placeholder="Hi, I’m Phu!" {...form.register('greeting')} />
        </div>
      </div>

      {/* Quote */}
      <div className="space-y-2">
        <Label>Quote</Label>
        <Textarea rows={3} {...form.register('quote')} />
      </div>

      {/* Bio */}
      {/*<div className="space-y-2">*/}
      {/*  <Label>Short Bio</Label>*/}
      {/*  <Textarea rows={3} {...form.register('bio')} />*/}
      {/*</div>*/}

      <div className="space-y-2">
        <Label>About Me</Label>
        <Textarea rows={6} {...form.register('aboutMe')} />
      </div>

      {/* Social Links */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Social Links</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Input placeholder="LinkedIn URL" {...form.register('linkedIn')} />
          <Input placeholder="GitHub URL" {...form.register('github')} />
          <Input placeholder="Twitter/X URL" {...form.register('twitter')} />
          <Input placeholder="Personal Portfolio" {...form.register('portfolio')} />
        </div>
      </div>

      <Button type="submit" size="lg">Save Changes</Button>
    </form>
  );
}
