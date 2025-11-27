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

const profileSchema = z.object({
  name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().optional(),
  tagLine: z.string().optional(),
  bio: z.string().optional(),
  aboutMe: z.string().optional(),
  quote: z.string().optional(),
  linkedIn: z.string().url().or(z.literal('')).optional(),
  github: z.string().url().or(z.literal('')).optional(),
  twitter: z.string().url().or(z.literal('')).optional(),
  portfolio: z.string().url().or(z.literal('')).optional(),
  image: z.string().optional(),
});

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
      toast({ title: 'Thành công', description: 'Cập nhật hồ sơ thành công!' });
    } else {
      toast({ title: 'Lỗi', description: res.error, variant: 'destructive' });
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <div className="flex items-center gap-6">
        <div>
          <Avatar className="h-24 w-24">
            <AvatarImage src={form.watch('image') || user.image || ''} />
            <AvatarFallback>{user.name?.[0] || 'U'}</AvatarFallback>
          </Avatar>
        </div>
        <UploadButton
          endpoint="imageUploader"
          onClientUploadComplete={(res) => {
            form.setValue('image', res[0].url);
            toast({ title: 'Upload thành công!' });
          }}
          onUploadError={(error) => {
            toast({ title: 'Lỗi upload', description: error.message, variant: 'destructive' });
          }}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Họ và tên</Label>
          <Input {...form.register('name')} />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" {...form.register('email')} />
        </div>
        <div className="space-y-2">
          <Label>Số điện thoại</Label>
          <Input {...form.register('phoneNumber')} />
        </div>
        <div className="space-y-2">
          <Label>Tagline (ngắn gọn)</Label>
          <Input placeholder="Full-stack Developer | Open Source Lover" {...form.register('tagLine')} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Giới thiệu ngắn (Bio)</Label>
        <Textarea rows={3} {...form.register('bio')} />
      </div>

      <div className="space-y-2">
        <Label>Về tôi (About Me)</Label>
        <Textarea rows={6} {...form.register('aboutMe')} />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Mạng xã hội</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Input placeholder="LinkedIn URL" {...form.register('linkedIn')} />
          <Input placeholder="GitHub URL" {...form.register('github')} />
          <Input placeholder="Twitter/X URL" {...form.register('twitter')} />
          <Input placeholder="Portfolio cá nhân" {...form.register('portfolio')} />
        </div>
      </div>

      <Button type="submit" size="lg">Lưu thay đổi</Button>
    </form>
  );
}
