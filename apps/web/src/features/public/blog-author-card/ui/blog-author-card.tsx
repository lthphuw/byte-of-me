import { Avatar, AvatarFallback, AvatarImage, Card } from '@byte-of-me/ui';

import type { BlogAuthor } from '@/entities/blog';
import { getPublicUserProfile } from '@/entities/user-profile/api/get-public-user-profile';

export async function BlogAuthorCard({
  author,
  label,
}: {
  author?: Maybe<BlogAuthor>;
  label: string;
}) {
  const resp = await getPublicUserProfile();
  const profile = resp.success ? resp.data : null;

  const name = author?.name || profile?.displayName || '';
  const bio = profile?.bio;

  if (!name && !bio) return null;

  return (
    <Card className="flex items-start gap-4 p-5">
      <Avatar className="h-14 w-14">
        <AvatarImage src={author?.avatar ?? undefined} alt={name} />
        <AvatarFallback>{name.charAt(0).toUpperCase() || '?'}</AvatarFallback>
      </Avatar>
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="font-semibold">{name}</p>
        {bio && <p className="text-sm text-muted-foreground">{bio}</p>}
      </div>
    </Card>
  );
}
