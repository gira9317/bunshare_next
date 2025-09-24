import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  const sort = searchParams.get('sort') || 'followers';
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  if (!query.trim()) {
    return NextResponse.json({ 
      users: [], 
      hasMore: false 
    });
  }

  try {
    const supabase = await createClient();
    
    // 高速検索関数を使用（トライグラム + インデックス最適化）
    const { data: users, error } = await supabase
      .rpc('search_users_fast', {
        search_query: query,
        sort_by: sort,
        search_limit: limit,
        search_offset: offset
      });

    if (error) {
      console.error('User search error:', error);
      return NextResponse.json({ 
        error: 'Search failed', 
        details: error.message,
        users: [],
        hasMore: false
      }, { status: 500 });
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ 
        users: [], 
        hasMore: false 
      });
    }

    // 結果を整形（usersテーブルから直接統計情報を取得）
    // SQLでソート済みなのでJavaScriptでの再ソートは不要
    const formattedUsers = users.map(user => ({
      user_id: user.id,
      username: user.username,
      display_name: user.username,
      bio: user.bio,
      avatar_url: user.avatar_img_url,
      works_count: user.works_count || 0,
      followers_count: user.followers_count || 0,
      following_count: user.following_count || 0,
      total_likes: 0 // TODO: likesテーブルから集計
    }));

    return NextResponse.json({ 
      users: formattedUsers,
      hasMore: formattedUsers.length === limit
    });
  } catch (error) {
    console.error('User search error:', error);
    return NextResponse.json({ 
      error: 'Search failed', 
      details: error instanceof Error ? error.message : String(error),
      users: [],
      hasMore: false
    }, { status: 500 });
  }
}