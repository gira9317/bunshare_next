'use server';

import { revalidateTag } from 'next/cache';

export async function revalidateTrends() {
  revalidateTag('trends');
  revalidateTag('trending-works');
  revalidateTag('trend-tags');
  revalidateTag('hero-banners');
  revalidateTag('works-ranking');
  revalidateTag('users-ranking');
  revalidateTag('announcements');
}