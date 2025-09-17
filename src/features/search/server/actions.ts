'use server';

import { redirect } from 'next/navigation';
import { SearchFiltersSchema, SearchParamsSchema } from '../schemas';
import { searchWorks } from './loader';

export async function executeSearch(formData: FormData) {
  const query = formData.get('query') as string;
  
  if (!query?.trim()) {
    return { error: '検索クエリを入力してください' };
  }

  // 検索結果ページにリダイレクト
  const searchParams = new URLSearchParams({ q: query.trim() });
  redirect(`/app/search?${searchParams.toString()}`);
}

export async function updateSearchFilters(
  query: string,
  filters: {
    category?: string;
    sort?: string;
  },
  page?: number
) {
  try {
    const validatedFilters = SearchFiltersSchema.parse({
      category: filters.category || 'all',
      sort: filters.sort || 'relevance'
    });

    const searchParams = new URLSearchParams({ q: query });
    
    if (validatedFilters.category !== 'all') {
      searchParams.set('category', validatedFilters.category);
    }
    if (validatedFilters.sort !== 'relevance') {
      searchParams.set('sort', validatedFilters.sort);
    }
    if (page && page > 1) {
      searchParams.set('page', page.toString());
    }

    redirect(`/app/search?${searchParams.toString()}`);
  } catch (error) {
    console.error('Filter update error:', error);
    return { error: 'フィルターの更新に失敗しました' };
  }
}

export async function getSearchResults(
  query: string,
  filters: {
    category: string;
    sort: string;
  },
  page: number = 1,
  limit: number = 12
) {
  try {
    const validatedParams = SearchParamsSchema.parse({
      query,
      filters,
      page,
      limit
    });

    return await searchWorks(validatedParams);
  } catch (error) {
    console.error('Search results error:', error);
    throw new Error('検索結果の取得に失敗しました');
  }
}