import { prisma } from '@db/client';

import { getCurrentUser } from '@/lib/session';
import { ProfileManager } from '@/components/profile-form';





export const metadata = { title: 'Thông tin cá nhân' };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      name: true,
      firstName: true,
      lastName: true,
      email: true,
      phoneNumber: true,
      image: true,
      bio: true,
      aboutMe: true,
      greeting: true,
      tagLine: true,
      quote: true,
      linkedIn: true,
      github: true,
      twitter: true,
      portfolio: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Thông tin cá nhân</h1>
        <p className="text-muted-foreground">Cập nhật hồ sơ cá nhân và các liên kết mạng xã hội</p>
      </div>

      <ProfileManager user={userData as any} />
    </div>
  );
}
