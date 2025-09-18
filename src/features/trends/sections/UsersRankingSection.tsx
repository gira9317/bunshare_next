import { Suspense } from 'react';
import { UsersRankingContent } from './UsersRankingContent';
import { getUsersRanking } from '../server/loader';
import { FileText, Heart, Eye, Users, Star, MessageSquare } from 'lucide-react';

type RankingCategory = 'posts' | 'likes' | 'views' | 'followers' | 'newcomers' | 'interactions';

async function UsersRankingDataLoader() {
  // サーバーサイドで各部門のデータを取得
  const [postsUsers, likesUsers, viewsUsers, followersUsers, newcomersUsers, interactionsUsers] = await Promise.all([
    getUsersRanking('posts', 9),
    getUsersRanking('likes', 9),
    getUsersRanking('views', 9),
    getUsersRanking('followers', 9),
    getUsersRanking('newcomers', 9),
    getUsersRanking('interactions', 9)
  ]);

  const rankings = [
    {
      category: 'posts' as RankingCategory,
      title: '投稿の達人',
      criterion: '作品投稿数順',
      icon: <FileText className="w-5 h-5" />,
      color: 'from-green-400 to-emerald-500',
      users: postsUsers
    },
    {
      category: 'likes' as RankingCategory,
      title: '人気作家',
      criterion: '総いいね数順',
      icon: <Heart className="w-5 h-5" />,
      color: 'from-red-400 to-pink-500',
      users: likesUsers
    },
    {
      category: 'views' as RankingCategory,
      title: '注目作家',
      criterion: '総閲覧数順',
      icon: <Eye className="w-5 h-5" />,
      color: 'from-blue-400 to-indigo-500',
      users: viewsUsers
    },
    {
      category: 'followers' as RankingCategory,
      title: 'インフルエンサー',
      criterion: 'フォロワー数順',
      icon: <Users className="w-5 h-5" />,
      color: 'from-purple-400 to-violet-500',
      users: followersUsers
    },
    {
      category: 'newcomers' as RankingCategory,
      title: '新人作家',
      criterion: '30日以内登録・高エンゲージメント',
      icon: <Star className="w-5 h-5" />,
      color: 'from-yellow-400 to-orange-500',
      users: newcomersUsers
    },
    {
      category: 'interactions' as RankingCategory,
      title: '交流の達人',
      criterion: '総コメント・いいね数順',
      icon: <MessageSquare className="w-5 h-5" />,
      color: 'from-cyan-400 to-teal-500',
      users: interactionsUsers
    }
  ];

  return <UsersRankingContent initialRankings={rankings} />;
}

function UsersRankingLoading() {
  return (
    <div className="space-y-8">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="space-y-4">
          <div className="h-8 bg-gray-200 rounded w-40 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, j) => (
              <div key={j} className="h-24 bg-gray-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function UsersRankingSection() {
  return (
    <Suspense fallback={<UsersRankingLoading />}>
      <UsersRankingDataLoader />
    </Suspense>
  );
}