import { getCurrentUser } from '@/lib/session';
import { prisma } from '@db/client';
import { BannerManager } from '@/components/banner-manager';

export const metadata = { title: 'Banner Images' };

export default async function BannerPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const banners = await prisma.userBannerImage.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Banner Images</h1>
          <p className="text-muted-foreground">Quản lý ảnh bìa cho trang chủ portfolio</p>
        </div>
      </div>

      <BannerManager initialBanners={banners} />
    </div>
  );
}
