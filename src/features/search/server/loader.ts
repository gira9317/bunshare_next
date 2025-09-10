import { createClient } from '@/lib/supabase/server';
import { SearchParams, SearchResponse, SearchResult, AuthorResult } from '../types';
import { getViewsCountByPeriod } from './views';

const SEARCH_CONFIG = {
  VECTOR_WEIGHT: 0.5,
  KEYWORD_WEIGHT: 0.3,
  POPULARITY_WEIGHT: 0.2,
  MIN_SCORE_THRESHOLD: 0.1,
  VECTOR_SIMILARITY_THRESHOLD: 0.7
};

export async function searchWorks(params: SearchParams): Promise<SearchResponse> {
  const supabase = await createClient();
  const { query, filters, page, limit } = params;
  const offset = (page - 1) * limit;

  try {
    // 作品検索クエリを構築
    let worksQuery = supabase
      .from('works')
      .select(`
        work_id,
        title,
        category,
        views_count,
        likes_count,
        comments_count,
        views,
        likes,
        comments,
        rating,
        average_rating,
        total_ratings,
        content_quality_score,
        score_normalized,
        description,
        image_url,
        created_at,
        updated_at,
        series_id,
        episode_number,
        user_id,
        tags,
        trend_score,
        recent_views_24h,
        recent_views_7d,
        users!works_user_id_fkey (
          username,
          avatar_img_url
        )
      `, { count: 'exact' })
      .eq('is_published', true);

    // キーワード検索（タイトル、説明、タグ）
    if (query) {
      worksQuery = worksQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
    }

    // カテゴリフィルター
    if (filters.category !== 'all') {
      worksQuery = worksQuery.eq('category', filters.category);
    }

    // ソート順 (新しいカラムを活用)
    switch (filters.sort) {
      case 'popular_all':
        worksQuery = worksQuery.order('trend_score', { ascending: false });
        break;
      case 'likes':
        worksQuery = worksQuery.order('likes_count', { ascending: false });
        break;
      case 'newest':
        worksQuery = worksQuery.order('created_at', { ascending: false });
        break;
      case 'oldest':
        worksQuery = worksQuery.order('created_at', { ascending: true });
        break;
      case 'popular_today':
        worksQuery = worksQuery.order('recent_views_24h', { ascending: false });
        break;
      case 'popular_week':
        worksQuery = worksQuery.order('recent_views_7d', { ascending: false });
        break;
      case 'popular_month':
        // 月間は集計カラムを使用
        worksQuery = worksQuery.order('views_count', { ascending: false });
        break;
      default: // relevance
        worksQuery = worksQuery.order('trend_score', { ascending: false });
    }

    // ページネーション
    worksQuery = worksQuery.range(offset, offset + limit - 1);

    const { data: works, error: worksError, count: worksCount } = await worksQuery;

    if (worksError) {
      console.error('Works search error:', worksError);
      throw worksError;
    }

    // 作者検索（ユーザー名とカスタムIDで検索）
    const { data: authors, error: authorsError, count: authorsCount } = await supabase
      .from('users')
      .select(`
        id,
        username,
        custom_user_id,
        bio,
        avatar_img_url
      `, { count: 'exact' })
      .or(`username.ilike.%${query}%,custom_user_id.ilike.%${query}%`)
      .order('username', { ascending: true })
      .range(0, 23); // 最大24人の作者を取得

    if (authorsError) {
      console.error('Authors search error:', authorsError);
    }

    // 結果を整形
    const formattedWorks: SearchResult[] = (works || []).map(work => ({
      work_id: work.work_id,
      title: work.title,
      category: work.category,
      views: work.views_count || work.views || 0,
      likes: work.likes_count || work.likes || 0,
      comments: work.comments_count || work.comments || 0,
      // 新旧両方の形式をサポート
      views_count: work.views_count,
      likes_count: work.likes_count,
      comments_count: work.comments_count,
      rating: work.rating,
      average_rating: work.average_rating,
      total_ratings: work.total_ratings,
      content_quality_score: work.content_quality_score,
      score_normalized: work.score_normalized,
      description: work.description,
      image_url: work.image_url,
      created_at: work.created_at,
      updated_at: work.updated_at,
      series_id: work.series_id,
      episode_number: work.episode_number,
      user_id: work.user_id,
      username: work.users?.username,
      display_name: work.users?.username, // usernameを表示名として使用
      avatar_url: work.users?.avatar_img_url,
      tags: work.tags || []
    }));

    // 作者の統計情報をusersテーブルから直接取得（高速）
    const authorIds = (authors || []).map(a => a.id);
    let authorStats: Record<string, { works_count: number; followers_count: number; following_count: number }> = {};

    if (authorIds.length > 0) {
      // usersテーブルから集計済みの統計を直接取得
      const { data: authorStatsData } = await supabase
        .from('users')
        .select('id, works_count, followers_count, following_count')
        .in('id', authorIds);

      // 統計データをマップに変換
      authorStatsData?.forEach(user => {
        authorStats[user.id] = {
          works_count: user.works_count || 0,
          followers_count: user.followers_count || 0,
          following_count: user.following_count || 0
        };
      });
    }

    const formattedAuthors: AuthorResult[] = (authors || []).map(author => ({
      user_id: author.id,
      username: author.username,
      display_name: author.username, // usernameを表示名として使用
      bio: author.bio,
      avatar_url: author.avatar_img_url,
      followers_count: authorStats[author.id]?.followers_count || 0,
      following_count: authorStats[author.id]?.following_count || 0,
      works_count: authorStats[author.id]?.works_count || 0,
      total_likes: 0 // TODO: 実装が必要
    }));

    // 期間別人気ソートの場合、views_logからデータを取得して並び替え
    let sortedWorks = formattedWorks;
    if (filters.sort === 'popular_today' || filters.sort === 'popular_week' || filters.sort === 'popular_month') {
      const period = filters.sort === 'popular_today' ? 'today' : 
                     filters.sort === 'popular_week' ? 'week' : 'month';
      const workIds = formattedWorks.map(w => w.work_id);
      const viewCounts = await getViewsCountByPeriod(workIds, period);
      
      // 期間内の視聴回数が全て0かチェック
      const hasAnyViews = Object.values(viewCounts).some(count => count > 0);
      
      if (!hasAnyViews) {
        // 期間内の視聴回数が全て0の場合、全期間の視聴回数（viewsカラム）でソート
        console.log(`${period}の視聴回数が全て0のため、全期間の視聴回数でソート`);
        sortedWorks = formattedWorks.sort((a, b) => {
          const aViews = a.views || 0;
          const bViews = b.views || 0;
          
          // 両方0の場合は、作成日時の新しい順
          if (aViews === 0 && bViews === 0) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          
          // 片方が0の場合は、0を後ろに
          if (aViews === 0) return 1;
          if (bViews === 0) return -1;
          
          // 両方に視聴回数がある場合は、視聴回数の多い順
          return bViews - aViews;
        });
      } else {
        // 期間内の視聴回数でソート（0回のものは後ろに）
        sortedWorks = formattedWorks.sort((a, b) => {
          const aViews = viewCounts[a.work_id] || 0;
          const bViews = viewCounts[b.work_id] || 0;
          
          // 両方0の場合は、全期間の視聴回数でソート
          if (aViews === 0 && bViews === 0) {
            const aTotalViews = a.views || 0;
            const bTotalViews = b.views || 0;
            
            if (aTotalViews === bTotalViews) {
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
            return bTotalViews - aTotalViews;
          }
          
          // 片方が0の場合は、0を後ろに
          if (aViews === 0) return 1;
          if (bViews === 0) return -1;
          
          // 両方に閲覧数がある場合は、閲覧数の多い順
          return bViews - aViews;
        });
      }
    }

    return {
      works: sortedWorks,
      authors: formattedAuthors,
      total_works: worksCount || 0,
      total_authors: authorsCount || 0,
      has_more_works: (worksCount || 0) > offset + limit,
      has_more_authors: (authorsCount || 0) > 12
    };

  } catch (error) {
    console.error('Search error:', error);
    throw new Error('検索に失敗しました');
  }
}