import { getSearchResults } from '../server/actions';
import { SearchFilters } from '../types';
import { WorkCard } from '@/components/domain/WorkCard'
import { TrackedWorkCard } from '@/components/domain/TrackedWorkCard';
import { UserCard } from '@/features/users/leaf/UserCard';
import { EmptyResults } from '../leaf/EmptyResults';
import { ResultsPagination } from '../leaf/ResultsPagination';
import { RelatedSearches } from '../leaf/RelatedSearches';
import { UserResultsWrapper } from '../components/UserResultsWrapper';

interface SearchResultsSectionProps {
  query: string;
  filters: SearchFilters;
  page: number;
}

export async function SearchResultsSection({ 
  query, 
  filters, 
  page 
}: SearchResultsSectionProps) {
  const searchType = filters.type || 'all';
  if (!query.trim()) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">
          検索キーワードを入力してください
        </p>
      </div>
    );
  }

  try {
    const results = await getSearchResults(query, filters, page);
    const { works, authors, total_works, total_authors, has_more_works } = results;

    if (works.length === 0 && authors.length === 0) {
      return <EmptyResults query={query} />;
    }

    // 常に両方を表示
    const showAuthors = true;
    const showWorks = true;

    return (
      <div className="search-results-section space-y-8">
        {/* 作者セクション */}
        {showAuthors && authors.length > 0 && (
          <UserResultsWrapper
            users={authors}
            searchType={searchType}
            query={query}
            totalCount={total_authors}
          />
        )}

        {/* 作品セクション */}
        {showWorks && works.length > 0 && (
          <section className="works-section">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                作品 ({total_works}件)
              </h2>
            </div>
            
            <div className="works-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {works.map((work, index) => (
                <TrackedWorkCard 
                  key={work.work_id}
                  work={{
                    work_id: work.work_id,
                    title: work.title,
                    author: work.username || '不明',
                    category: work.category,
                    views: work.views,
                    likes: work.likes,
                    comments: work.comments,
                    rating: work.rating,
                    average_rating: work.average_rating,
                    total_ratings: work.total_ratings,
                    description: work.description,
                    image_url: work.image_url,
                    created_at: work.created_at,
                    updated_at: work.updated_at,
                    series_id: work.series_id,
                    episode_number: work.episode_number,
                    user_id: work.user_id,
                    user: {
                      username: work.username || '',
                      display_name: work.display_name,
                      avatar_url: work.avatar_url
                    }
                  }}
                  disableContinueDialog={true}
                  trackingContext={{
                    impressionType: 'search',
                    pageContext: 'search',
                    position: index + 1,
                    additionalData: {
                      query,
                      searchType,
                      page
                    }
                  }}
                />
              ))}
            </div>

            {/* ページネーション */}
            {total_works > 12 && (
              <ResultsPagination 
                currentPage={page}
                totalResults={total_works}
                hasMore={has_more_works}
                query={query}
                filters={filters}
              />
            )}
          </section>
        )}

        {/* 関連検索 */}
        {works.length > 0 && (
          <RelatedSearches 
            currentQuery={query}
            tags={works.flatMap(w => w.tags || []).filter((tag, index, self) => self.indexOf(tag) === index)}
          />
        )}
      </div>
    );
  } catch (error) {
    console.error('Search results error:', error);
    return (
      <div className="text-center py-12">
        <p className="text-red-500">
          検索結果の取得に失敗しました。しばらくしてから再度お試しください。
        </p>
      </div>
    );
  }
}