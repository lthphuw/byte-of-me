import { getLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';

// This page only renders when the app is built statically (output: 'export')
export default async function RootPage() {
    const locale = await getLocale();
    redirect(`/${locale ?? "en"}`);
}