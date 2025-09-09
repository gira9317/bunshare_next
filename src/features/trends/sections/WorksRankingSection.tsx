import { Suspense } from 'react';
import { WorksRankingContent } from './WorksRankingContent';
import { getWorksRanking } from '../server/loader';
import { Trophy, Calendar } from 'lucide-react';

type RankingPeriod = 'all' | 'monthly' | 'weekly' | 'daily';

async function WorksRankingDataLoader() {
  // サーバーサイドでデータを取得
  const [allWorks, monthlyWorks, weeklyWorks, dailyWorks] = await Promise.all([
    getWorksRanking('all', 9),
    getWorksRanking('monthly', 9),
    getWorksRanking('weekly', 9),
    getWorksRanking('daily', 9)
  ]);

  const rankings = [
    {
      period: 'all' as RankingPeriod,
      title: '全期間',
      criterion: '総閲覧数順',
      icon: <Trophy className="w-5 h-5" />,
      color: 'from-yellow-400 to-orange-500',
      works: allWorks
    },
    {
      period: 'monthly' as RankingPeriod,
      title: '今月',
      criterion: '月間閲覧数順',
      icon: <Calendar className="w-5 h-5" />,
      color: 'from-blue-400 to-indigo-500',
      works: monthlyWorks
    },
    {
      period: 'weekly' as RankingPeriod,
      title: '今週',
      criterion: '週間閲覧数順',
      icon: <Calendar className="w-5 h-5" />,
      color: 'from-green-400 to-emerald-500',
      works: weeklyWorks
    },
    {
      period: 'daily' as RankingPeriod,
      title: '今日',
      criterion: '日間閲覧数順',
      icon: <Calendar className="w-5 h-5" />,
      color: 'from-purple-400 to-pink-500',
      works: dailyWorks
    }
  ];

  return <WorksRankingContent initialRankings={rankings} />;
}

function WorksRankingLoading() {
  return (
    <div className="space-y-8">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, j) => (
              <div key={j} className="aspect-[16/9] bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function WorksRankingSection() {
  return (
    <Suspense fallback={<WorksRankingLoading />}>
      <WorksRankingDataLoader />
    </Suspense>
  );
}