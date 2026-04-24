import { getTranslations } from 'next-intl/server';

import { Routes } from '@/shared/config/global';
import { Link } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/utils';
import { Button, GoBackButton, Icons } from '@/shared/ui';

export default async function NotFound() {
  const t = await getTranslations('notFound');
  return (
    <section className="relative z-30">
      <div className="container mx-auto flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full">
          <div className="mx-auto flex max-w-lg flex-col  items-stretch gap-2 text-center md:items-center md:gap-4">
            <h1 className="scroll-m-20 text-balance text-center text-4xl font-extrabold tracking-tight">
              404
            </h1>
            <h1 className="mt-2 text-xl font-bold text-gray-800 dark:text-white">
              {t('oopsPageNotFound')}
            </h1>
            <p className="text-gray-900 dark:text-gray-400">
              {`${t('sorryWeCouldntFindThatPage')}. ${t(
                'pleaseCheckTheUrlOrGoBackHome'
              )}.`}
            </p>

            <div className="mt-2 flex flex-col flex-wrap gap-4 md:flex-row">
              <GoBackButton> {t('goBack')}</GoBackButton>
              <Link href={Routes.Homepage}>
                <Button
                  variant="secondary"
                  className={cn(
                    'w-full gap-1 py-3 text-lg md:w-auto md:py-2 md:text-base shadow-md'
                  )}
                >
                  <span>{t('home')}</span>
                </Button>
              </Link>
            </div>
          </div>

          <div className="mx-auto mt-8 grid w-full max-w-6xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                href: '/about',
                title: t('aboutMe'),
                desc: t('learnMoreAboutMyBackgroundAndJourney'),
                link: t('explore'),
                icon: <Icons.page />,
              },
              {
                href: '/projects',
                title: t('seeMyWork'),
                desc: t('checkOutTheProjectsIveBuilt'),
                link: t('explore'),
                icon: <Icons.project />,
              },
              {
                href: '/contact',
                title: t('contact'),
                desc: t('reachOutForCollaborationOrQuestions') + '.',
                link: t('explore'),
                icon: <Icons.contact />,
              },
            ].map(({ icon, href, title, desc, link }) => (
              <div
                key={href}
                className="dura flex flex-col gap-2 rounded-lg bg-gray-100 p-6 shadow-xl transition-all duration-300 hover:shadow-2xl dark:bg-gray-900"
              >
                {icon}
                <h3 className="text-md mt-4 font-medium text-gray-700 dark:text-gray-200">
                  {title}
                </h3>
                <p className="text-gray-500 dark:text-gray-400">{desc}</p>
                <Link
                  href={href}
                  className="mt-auto inline-flex items-center gap-2 text-sm font-semibold transition-all hover:underline"
                >
                  <span>{link}</span>
                  <Icons.arrowRight />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
