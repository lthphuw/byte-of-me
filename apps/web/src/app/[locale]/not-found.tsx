import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import GoBackButton from '@/components/go-back';
import { Icons } from '@/components/icons';





export default async function NotFound() {
  const t = await getTranslations('notFound');
  return (
    <section className="relative z-30">
      <div className="container flex items-center justify-center min-h-screen px-6 py-12 mx-auto">
        <div className="w-full">
          <div className="flex flex-col gap-2 md:gap-4  items-stretch md:items-center max-w-lg mx-auto text-center">
            <h1 className="scroll-m-20 text-center text-4xl font-extrabold tracking-tight text-balance">
              404
            </h1>
            <h1 className="mt-2 text-xl font-bold text-gray-800 dark:text-white">
              {t('Oops! Page not found')}
            </h1>
            <p className="text-gray-900 dark:text-gray-400">
              {`${t('Sorry, we couldn’t find that page')}. ${t(
                'Please check the URL or go back home'
              )}.`}
            </p>

            <div className="flex flex-col flex-wrap gap-4 mt-2 md:flex-row">
              <GoBackButton> {t('Go back')}</GoBackButton>
              <Link href="/">
                <Button
                  variant="secondary"
                  className={cn(
                    'w-full gap-1 py-3 text-lg md:w-auto md:py-2 md:text-base shadow-md'
                  )}
                >
                  <span>{t('Home')}</span>
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid w-full max-w-6xl grid-cols-1 gap-8 mx-auto mt-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                href: '/about',
                title: t('About me'),
                desc: t('Learn more about my background and journey') + '.',
                link: t('Explore'),
                icon: <Icons.page />,
              },
              {
                href: '/projects',
                title: t('See my work'),
                desc: t("Check out the projects I've built") + '.',
                link: t('Explore'),
                icon: <Icons.project />,
              },
              {
                href: '/contact',
                title: t('Contact'),
                desc: t('Reach out for collaboration or questions') + '.',
                link: t('Explore'),
                icon: <Icons.contact />,
              },
            ].map(({ icon, href, title, desc, link }) => (
              <div
                key={href}
                className="p-6 rounded-lg gap-2 flex flex-col shadow-xl duration-300 transition-all dura hover:shadow-2xl bg-gray-100 dark:bg-gray-900"
              >
                {icon}
                <h3 className="mt-4 font-medium text-md text-gray-700 dark:text-gray-200">
                  {title}
                </h3>
                <p className="text-gray-500 dark:text-gray-400">{desc}</p>
                <Link
                  href={href}
                  className="inline-flex gap-2 transition-all items-center font-semibold mt-auto text-sm hover:underline"
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
