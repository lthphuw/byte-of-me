import { Mail } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { getPublicInfoForFooter } from '@/features/public/public-site-footer/lib';
import { globalConfig,Routes } from '@/shared/config/global';
import { Link } from '@/shared/i18n/navigation';
import { cn, ensureValidUrl } from '@/shared/lib/utils';
import { Icons } from '@/shared/ui/icons';





type SiteFooterProps = React.HTMLAttributes<HTMLElement>;

export async function PublicSiteFooter({ className }: SiteFooterProps) {
  const [t, resp] = await Promise.all([
    getTranslations('global.footer'),
    getPublicInfoForFooter(),
  ]);
  if (!resp.success) return null;

  const { email, displayName, socialLinks } = resp.data;

  const githubLink = socialLinks.find((it) => it.platform === 'github');
  const linkedInLink = socialLinks.find((it) => it.platform === 'linkedIn');

  return (
    <footer className={cn('py-8 relative z-20', className)}>
      <div className="container mx-auto flex max-w-[100%] flex-col items-center justify-between gap-6 px-4 md:flex-row md:px-12">
        <div className="flex flex-col items-center gap-2 md:items-start">
          <Link href={Routes.Homepage} aria-label={t('home')}>
            <Icons.logo />
          </Link>

          <h2 className="flex gap-1 text-center text-sm md:text-left">
            <span className="hidden md:inline-block">{t('builtBy')}</span>
            <a
              href={`mailto:${email}`}
              className="font-medium underline underline-offset-4 hover:text-blue-400"
            >
              {displayName}
            </a>
          </h2>
        </div>

        <nav
          className="flex flex-wrap items-center justify-center gap-2 md:items-start md:gap-6"
          aria-label={t('navigation')}
        >
          {globalConfig.footer.nav.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className="text-sm hover:text-blue-400 md:text-base"
            >
              {t(it.title as never)}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col items-center gap-2 md:items-end">
          <div className="flex gap-4">
            {githubLink && (
              <a
                href={ensureValidUrl(githubLink.url)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="hover:text-blue-400"
              >
                <Icons.github size={20} />
              </a>
            )}

            {linkedInLink && (
              <a
                href={ensureValidUrl(linkedInLink.url)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="hover:text-blue-400"
              >
                <Icons.linkedin size={20} />
              </a>
            )}

            <a
              href={`mailto:${email}`}
              aria-label={t('email')}
              className="hover:text-blue-400"
            >
              <Mail size={20} />
            </a>
          </div>

          {/*<p className="text-sm text-gray-400">*/}
          {/*  {t('license')}{' '}*/}
          {/*  <a*/}
          {/*    href="https://github.com/lthphuw/byte-of-me/blob/main/LICENSE.md"*/}
          {/*    target="_blank"*/}
          {/*    rel="noopener noreferrer"*/}
          {/*    className="hover:text-blue-400"*/}
          {/*  >*/}
          {/*    MIT*/}
          {/*  </a>*/}
          {/*</p>*/}
        </div>
      </div>
    </footer>
  );
}
