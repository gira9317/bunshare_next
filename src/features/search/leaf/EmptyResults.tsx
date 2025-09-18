import { Search, Lightbulb } from 'lucide-react';

interface EmptyResultsProps {
  query: string;
}

export function EmptyResults({ query }: EmptyResultsProps) {
  return (
    <div className="empty-results text-center py-16">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          検索結果が見つかりませんでした
        </h2>
        
        <p className="text-gray-600 mb-8">
          <span className="font-medium text-blue-600">"{query}"</span>に関する作品や作者は見つかりませんでした。
        </p>
        
        <div className="bg-blue-50 rounded-lg p-6 text-left">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-blue-900 mb-2">
                検索のヒント:
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• キーワードの入力ミスがないか確認してください</li>
                <li>• より一般的なキーワードで検索してみてください</li>
                <li>• カテゴリフィルターを「すべて」に設定してください</li>
                <li>• 別の検索キーワードを試してみてください</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}