'use server';

import { revalidateTag } from 'next/cache';

export async function clearCache(tag: string = 'all') {
  revalidateTag(tag, 'max');
}
