import { z } from 'zod';

export const SearchFiltersSchema = z.object({
  category: z.enum(['all', '小説', '詩', 'エッセイ']).default('all'),
  sort: z.enum([
    'relevance',
    'popular_today', 
    'popular_week',
    'popular_month',
    'popular_all',
    'likes',
    'newest',
    'oldest'
  ]).default('relevance')
});

export const SearchParamsSchema = z.object({
  query: z.string().trim().min(1, '検索クエリが必要です'),
  filters: SearchFiltersSchema,
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(50).default(12)
});

export const SearchQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  sort: z.string().optional(),
  page: z.string().optional()
});

export type SearchFiltersInput = z.infer<typeof SearchFiltersSchema>;
export type SearchParamsInput = z.infer<typeof SearchParamsSchema>;
export type SearchQueryInput = z.infer<typeof SearchQuerySchema>;