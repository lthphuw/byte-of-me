// components/SiteFooter.tsx
import { Link } from '@/i18n/navigation';
import { fetchData } from '@/lib/fetch';
import { cn } from '@/lib/utils';
import { User } from '@db/index';
import { Facebook, Github, Linkedin, Mail } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Icons } from './icons';

interface SiteFooterProps extends React.HTMLAttributes<HTMLElement> { }

export async function SiteFooter({ className }: SiteFooterProps) {
  const t = await getTranslations('footer');
  const me = await fetchData<User>('me');

  return (
    <footer className={cn(' py-8 relative z-20', className)}>
      <div className="container mx-auto px-4 md:px-12 flex flex-col md:flex-row justify-between items-center gap-6">

        {/* Logo and Credit */}
        <div className="flex flex-col items-center md:items-start gap-2">
          <Link href="/" aria-label={t('home')}>
            <Icons.logo />
          </Link>

          <h2 className="text-center text-sm md:text-left">
            {t('builtBy')}{' '}
            <a
              href={`mailto:${me.email}`}
              className="font-medium underline underline-offset-4 hover:text-blue-400"
            >
              {me.name || 'lthphuw'}
            </a>
          </h2>
        </div>

        {/* Navigation Links */}
        <nav className="flex items-center md:items-start gap-2 md:gap-6" aria-label={t('navigation')}>
          <Link href="/about" className="hover:text-blue-400">{t('about')}</Link>
          <Link href="/experience" className="hover:text-blue-400">{t('experience')}</Link>
          <Link href="/projects" className="hover:text-blue-400">{t('projects')}</Link>
          <Link href="/contact" className="hover:text-blue-400">{t('contact')}</Link>
        </nav>

        {/* Social Media and License */}
        <div className="flex flex-col items-center md:items-start gap-2">
          <h3 className="text-lg font-semibold">{t('connect')}</h3>
          <div className="flex gap-4">
            {me.github && (
              <a
                href={me.github}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="hover:text-blue-400"
              >
                <Github size={20} />
              </a>
            )}

            {me.linkedIn && (
              <a
                href={me.linkedIn}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="hover:text-blue-400"
              >
                <Linkedin size={20} />
              </a>
            )}

            {me.facebook && (
              <a
                href={me.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="hover:text-blue-400"
              >
                <Facebook size={20} />
              </a>
            )}
            <a
              href={`mailto:${me.email}`}
              aria-label={t('email')}
              className="hover:text-blue-400"
            >
              <Mail size={20} />
            </a>
          </div>

          <p className="text-sm text-gray-400">
            {t('license')}{' '}
            <a
              href="https://github.com/lthphuw/byte-of-me/blob/main/LICENSE.md"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-400"
            >
              MIT
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}