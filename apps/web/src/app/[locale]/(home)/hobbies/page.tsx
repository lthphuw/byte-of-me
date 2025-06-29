import { HobbiesContent } from '@/components/hobbies-content';
import { HobbiesShell } from '@/components/shell';

// Next.js will invalidate the cache when a
// request comes in, at most once every 60 seconds.
export const revalidate = 86400;

// We'll prerender only the params from `generateStaticParams` at build time.
// If a request comes in for a path that hasn't been generated,
// Next.js will server-render the page on-demand.
export const dynamicParams = true; // or false, to 404 on unknown paths


export default async function HobbiesPage() {
  return (
    <HobbiesShell>
      <HobbiesContent />
    </HobbiesShell>
  );
}
