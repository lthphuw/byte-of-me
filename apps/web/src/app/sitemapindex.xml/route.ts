import { redirect } from 'next/navigation';

export async function GET() {
  redirect('/sitemap-index.xml');
}
