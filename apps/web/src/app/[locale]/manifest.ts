import type { MetadataRoute } from 'next';

const icons: MetadataRoute.Manifest['icons'] = [
  {
    src: '/android-chrome-192x192.png',
    sizes: '192x192',
    type: 'image/png',
    purpose: 'maskable',
  },
  {
    src: '/android-chrome-512x512.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'maskable',
  },
  {
    src: '/apple-touch-icon.png',
    sizes: '180x180',
    type: 'image/png',
  },
  {
    src: '/favicon.ico',
    sizes: '24x24',
    type: 'image/x-icon',
  },
];

const manifests: Record<string, MetadataRoute.Manifest> = {
  vi: {
    name: 'Byte of me | Lương Thanh Hoàng Phú',
    short_name: 'Byte of me',
    description:
      'Không gian cá nhân của Lương Thanh Hoàng Phú — nơi mình chia sẻ góc nhìn về phát triển web, công nghệ frontend và hành trình làm kỹ sư phần mềm fullstack.',
    start_url: '/vi/',
    scope: '/vi/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0f0f1a',
    theme_color: '#0f0f1a',
    lang: 'vi',
    dir: 'ltr',
    icons,
  },
  en: {
    name: 'Byte of me | Luong Thanh Hoang Phu',
    short_name: 'Byte of me',
    description:
      'The personal space of Luong Thanh Hoang Phu — where I share insights on web development, frontend technologies, and my journey as a fullstack software engineer.',
    start_url: '/en/',
    scope: '/en/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0f0f1a',
    theme_color: '#0f0f1a',
    lang: 'en',
    dir: 'ltr',
    icons,
  },
  fr: {
    name: 'Byte of me | Luong Thanh Hoang Phu',
    short_name: 'Byte of me',
    description:
      'L’espace personnel de Luong Thanh Hoang Phu — où je partage mes idées sur le développement web, les technologies frontend, et mon parcours en tant qu’ingénieur logiciel fullstack.',
    start_url: '/fr/',
    scope: '/fr/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0f0f1a',
    theme_color: '#0f0f1a',
    lang: 'fr',
    dir: 'ltr',
    icons,
  },
};

export default function manifest({
  params,
}: {
  params: { locale: string };
}): MetadataRoute.Manifest {
  return manifests[params.locale] ?? manifests.en;
}
