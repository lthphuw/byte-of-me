'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { saveProfile } from '@/app/[locale]/(dashboard)/dashboard/profile/action';
import { UploadButton } from '@/components/upload-button';
import { profileSchema } from '@/lib/validations/profile';

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
      <div className="flex items-center gap-6">
        <Avatar className="h-24 w-24">
          <AvatarImage src={form.watch('image') || user.image || ''} />
          <AvatarFallback>{user.name?.[0] || 'U'}</AvatarFallback>
        </Avatar>

        <UploadButton
          endpoint="imageUploader"
          onClientUploadComplete={(res) => {
            form.setValue('image', res[0].url);
            toast({ title: 'Upload successful!' });
          }}
          onUploadError={(error) => {
            toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
          }}
        />
      </div>

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
          <Input
            placeholder="Hi, I’m Phu!"
            {...form.register('greeting')}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Short Bio</Label>
        <Textarea rows={3} {...form.register('bio')} />
      </div>

      <div className="space-y-2">
        <Label>About Me</Label>
        <Textarea rows={6} {...form.register('aboutMe')} />
      </div>

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
