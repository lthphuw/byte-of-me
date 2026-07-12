'use client';

import { Button } from '@byte-of-me/ui';

import { useRouter } from '@/shared/i18n/navigation';

export function GoBackButton({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <Button
      onClick={() => router.back()}
      className="w-full py-3 text-lg shadow-md md:w-auto md:py-2 md:text-base "
    >
      {children}
    </Button>
  );
}
