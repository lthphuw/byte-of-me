import { cache } from 'react';

import 'server-only';

import { getBlogInteractionsForUser } from '@/features/public/toggle-blog-interactions/lib/get-blog-interactions-for-user';

/**
 * The action bar renders twice per post, so the wrappers would repeat the
 * session read and count query; `cache` runs each once per request. It lives
 * here because a `'use server'` file may only export async functions.
 */
export const getBlogInteractionsOnce = cache(getBlogInteractionsForUser);
