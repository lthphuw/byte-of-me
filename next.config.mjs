// next.config.mjs
import createNextIntlPlugin from 'next-intl/plugin';
import { withContentlayer } from 'next-contentlayer';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts'); // hoặc request.tsx

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['avatars.githubusercontent.com'],
  },
  experimental: {
    // Không cần `appDir: true` nếu Next 14+, App Router mặc định bật
  },
  serverExternalPackages: ['@prisma/client'],
};

export default withContentlayer(withNextIntl(nextConfig));
