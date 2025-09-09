import { createClient } from '@/lib/supabase/server';

interface ViewCounts {
  [workId: string]: number;
}

export async function getViewsCountByPeriod(
  workIds: string[], 
  period: 'today' | 'week' | 'month' | 'all'
): Promise<ViewCounts> {
  if (workIds.length === 0) return {};
  
  const supabase = await createClient();
  
  try {
    console.log(`📊 ${period}の閲覧数を取得中...`);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let dateFilter: string | null = null;
    
    switch(period) {
      case 'today':
        // 今日のみ
        dateFilter = today.toISOString().split('T')[0];
        break;
      case 'week':
        // 過去7日間
        const weekAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
        dateFilter = weekAgo.toISOString().split('T')[0];
        break;
      case 'month':
        // 過去30日間
        const monthAgo = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
        dateFilter = monthAgo.toISOString().split('T')[0];
        break;
      case 'all':
        // 全期間は worksテーブルのviewsカラムを使用
        return {};
    }
    
    if (!dateFilter) return {};
    
    // views_logから期間内の閲覧数を取得
    const { data: viewsData, error } = await supabase
      .from('views_log')
      .select('work_id')
      .in('work_id', workIds)
      .gte('viewed_date', dateFilter);
    
    if (error) {
      console.error('views_log取得エラー:', error);
      return {};
    }
    
    // work_idごとにカウント集計
    const viewCounts: ViewCounts = {};
    if (viewsData && viewsData.length > 0) {
      viewsData.forEach(view => {
        viewCounts[view.work_id] = (viewCounts[view.work_id] || 0) + 1;
      });
    }
    
    console.log(`✅ ${period}の閲覧数取得完了:`, Object.keys(viewCounts).length, '作品');
    return viewCounts;
    
  } catch (error) {
    console.error('閲覧数取得エラー:', error);
    return {};
  }
}