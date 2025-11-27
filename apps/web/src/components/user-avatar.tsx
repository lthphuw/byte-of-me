import { User } from 'next-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserAvatarProps {
  user: User;
  className?: string;
}

export function UserAvatar({ user, className }: UserAvatarProps) {
  return (
    <Avatar className={className}>
      <AvatarImage src={user.image || undefined} alt={user.name || ''} />
      <AvatarFallback>
        {user.name?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
      </AvatarFallback>
    </Avatar>
  );
}
