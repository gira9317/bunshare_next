import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  const sort = searchParams.get('sort') || 'followers';
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  if (!query.trim()) {
    return NextResponse.json({ users: [] });
  }

  try {
    const supabase = await createClient();
    
    // ユーザー検索クエリ
    let usersQuery = supabase
      .from('users')
      .select(`
        id,
        username,
        custom_user_id,
        bio,
        avatar_img_url
      `)
      .or(`username.ilike.%${query}%,custom_user_id.ilike.%${query}%,bio.ilike.%${query}%`)
      .limit(limit);

    // デフォルトソート（後でカウント後に再ソート）
    usersQuery = usersQuery.order('username', { ascending: true });

    const { data: users, error } = await usersQuery;

    if (error) {
      console.error('User search error:', error);
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    // 効率的なカウント集計（GROUP BYを使用）
    const userIds = users?.map(u => u.id) || [];
    
    if (userIds.length === 0) {
      return NextResponse.json({ users: [] });
    }
    
    // 作品数を集計
    const { data: worksCounts } = await supabase
      .from('works')
      .select('user_id, count:id.count()')
      .in('user_id', userIds)
      .eq('is_published', true)
      .group('user_id');
    
    // フォロワー数を集計（followed_idでグループ化）
    const { data: followersCounts } = await supabase
      .from('follows')
      .select('followed_id, count:id.count()')
      .in('followed_id', userIds)
      .eq('status', 'approved')
      .group('followed_id');
    
    // フォロー数を集計（follower_idでグループ化）
    const { data: followingCounts } = await supabase
      .from('follows')
      .select('follower_id, count:id.count()')
      .in('follower_id', userIds)
      .eq('status', 'approved')
      .group('follower_id');

    // カウントマップを作成
    const worksCountMap: Record<string, number> = {};
    const followersCountMap: Record<string, number> = {};
    const followingCountMap: Record<string, number> = {};
    
    worksCounts?.forEach(w => {
      worksCountMap[w.user_id] = w.count || 0;
    });
    
    followersCounts?.forEach(f => {
      followersCountMap[f.followed_id] = f.count || 0;
    });
    
    followingCounts?.forEach(f => {
      followingCountMap[f.follower_id] = f.count || 0;
    });

    // 結果を整形
    const formattedUsers = (users || []).map(user => ({
      user_id: user.id,
      username: user.username,
      display_name: user.username,
      bio: user.bio,
      avatar_url: user.avatar_img_url,
      works_count: worksCountMap[user.id] || 0,
      followers_count: followersCountMap[user.id] || 0,
      following_count: followingCountMap[user.id] || 0,
      total_likes: 0 // TODO: likesテーブルから集計
    }));

    // ソートを再適用（カウントを取得した後）
    if (sort === 'followers') {
      formattedUsers.sort((a, b) => b.followers_count - a.followers_count);
    } else if (sort === 'following') {
      formattedUsers.sort((a, b) => b.following_count - a.following_count);
    } else if (sort === 'works') {
      formattedUsers.sort((a, b) => b.works_count - a.works_count);
    }

    return NextResponse.json({ users: formattedUsers });
  } catch (error) {
    console.error('User search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}