// components/GoBackButton.tsx
'use client';

import { useRouter } from '@/i18n/navigation';

import { Button } from '@/components/ui/button';

export default function GoBackButton({
  children,
}: {
  children: React.ReactNode;
}) {
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
