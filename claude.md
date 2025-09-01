# Bunshare 開発ガイドライン

## プロジェクト構成
bunshare/
├─ app/ # Next.js App Router ページ
│ ├─ (marketing)/ # LP, 利用規約など
│ ├─ (app)/ # 認証後アプリ本体
│ │ ├─ users/[id]/...
│ │ ├─ works/[id]/...
│ │ ├─ search/...
│ │ └─ ...
│ └─ layout.tsx
├─ features/ # ドメインごとの機能境界
│ ├─ works/
│ │ ├─ server/ # loader, actions, queries
│ │ ├─ sections/ # 大きな画面ブロック
│ │ ├─ leaf/ # 小さなUI部品
│ │ ├─ schemas.ts # Zod スキーマ
│ │ ├─ types.ts
│ │ └─ index.ts # export 入口
│ └─ users/ ...
├─ components/
│ ├─ ui/ # 汎用UI (Button, Input...)
│ ├─ shared/ # 共通見た目部品
│ └─ domain/ # 特定ドメイン向けUI
├─ lib/ # 共通ロジック
│ ├─ supabase/ # server.ts / client.ts
│ ├─ auth.ts
│ ├─ cache.ts
│ └─ utils.ts
├─ styles/ # スタイル関連
│ ├─ globals.css
│ ├─ recipes.css # よく使う @apply
│ └─ tokens.css # デザイントークン
├─ supabase/ # Supabase CLI プロジェクト
│ └─ migrations/*.sql
├─ docs/ # 設計メモ・仕様
└─ scripts/ # ワンオフスクリプト

markdown
コードをコピーする

## 分割ルール
- Page: 200〜300行以内
- Section: 200行以内
- Leaf/Hook: 150行以内
- 250行を超えたら分割検討
- 再利用 3回以上で共通化、それ以下は直書きでOK
- 階層は **Page → Section → Leaf** の3段まで

## 命名規則
- 機能接頭辞: `Work*`, `User*`, `Search*`
- Section: `*Section` (例: `WorkBodySection`)
- Leaf: `Card`, `Meta`, `Tags`, `Actions` 等
- ファイル名＝コンポーネント名（1ファイル1コンポ）

## スタイリング方針
- **8:2 ルール**: 8割はTSXでTailwind直書き / 2割はCSSへ
- 繰り返し3回以上 or 120文字超 → `recipes.css` に @apply
- 擬似要素/特殊アニメ → CSS Module
- バリアント (primary/outline, sm/lg) → cva でTSXに残す
- 共通トークンは `tokens.css` + tailwind.config.ts で管理

## データフロー
- 読み取り: RSC + `features/*/server/loader.ts`
- 書き込み: Server Actions (`actions.ts`)
- キャッシュ: `lib/cache.ts` のタグ関数で統一
- 書き込み後は関連タグを revalidate

## 開発運用ルール
- PRは画面単位で小さく出す
- ESLint + Prettier + Tailwind プラグインを強制
- 主要機能ごとに `README.md` を置く
- ファイルが巨大化しそうなら Section/Leaf へ速やかに分割
- tailwind.cssのため、モバイルデザインファースト