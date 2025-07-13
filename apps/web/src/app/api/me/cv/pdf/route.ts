import { getLocale } from 'next-intl/server';
import puppeteer from 'puppeteer';

import { host } from '@/config/host';

export async function GET() {
  const locale = await getLocale();
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: await puppeteer.executablePath(),
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.goto(`${host}/${locale}/cv/printable`, {
    waitUntil: 'networkidle0',
  });

  const pdf = await page.pdf({ format: 'A4', printBackground: true });

  await browser.close();

  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=cv.pdf',
    },
  });
}
