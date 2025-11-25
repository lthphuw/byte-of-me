import { SiteFooter } from '@/components/site-footer';

interface AuthLayoutProps {
  children?: React.ReactNode;
}

export default async function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex relative min-h-screen flex-col overflow-hidden">
      <div className="container grid flex-1 gap-12">
        <main className="flex w-full flex-1 flex-col">{children}</main>
      </div>
      <SiteFooter className="border-t" />
    </div>
  );
}
