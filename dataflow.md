# Bunshare プロジェクト依存関係図

このドキュメントは、Bunshareプロジェクトの主要な依存関係をMermaid図で可視化したものです。
Ctrl + Shift + Vでプレビューを見ることができます。

---

## 目次

1. [全体アーキテクチャ](#1-全体アーキテクチャ)
2. [共通インフラストラクチャ](#2-共通インフラストラクチャ)
3. [ホームページ](#3-ホームページ)
4. [作品詳細ページ](#4-作品詳細ページ)
5. [検索ページ](#5-検索ページ)
6. [ユーザープロフィールページ](#6-ユーザープロフィールページ)
7. [投稿ページ](#7-投稿ページ)
8. [トレンドページ](#8-トレンドページ)
9. [認証ページ](#9-認証ページ)
10. [Feature内部構造](#10-feature内部構造)
11. [図の見方](#図の見方)
12. [開発時の注意点](#開発時の注意点)

---

## 1. 全体アーキテクチャ

### 1.1 レイヤー構造

Bunshareは以下の階層構造で構成されています：
- **Pages** (`app/`): Next.js App Routerページ
- **Features** (`features/`): ドメインごとの機能境界
- **Components** (`components/`): 共通UI部品
- **Lib** (`lib/`): 共通ロジック・ユーティリティ

```mermaid
graph TB
    %% === ルーティングレイヤー ===
    subgraph Pages["🌐 Pages Layer (app/)"]
        HOME["app/page.tsx<br/>Home"]
        WORK["works/[id]/page.tsx<br/>Work Detail"]
        PROFILE["profile/[id]/page.tsx<br/>User Profile"]
        SEARCH["search/page.tsx<br/>Search"]
        TRENDS["trends/page.tsx<br/>Trends"]
        POST["post/page.tsx<br/>Post Work"]
    end

    %% === 機能レイヤー ===
    subgraph Features["⚙️ Features Layer (features/)"]
        direction LR
        F_HOME["home/"]
        F_WORKS["works/"]
        F_USERS["users/"]
        F_SEARCH["search/"]
        F_TRENDS["trends/"]
        F_AUTH["auth/"]
        F_NOTIF["notifications/"]
    end

    %% === コンポーネントレイヤー ===
    subgraph Components["🎨 Components Layer (components/)"]
        direction LR
        UI["ui/<br/>(Button, Input...)"]
        SHARED["shared/<br/>(LoadingSpinner...)"]
        DOMAIN["domain/<br/>(domain-specific)"]
    end

    %% === ライブラリレイヤー ===
    subgraph Lib["📚 Lib Layer (lib/)"]
        direction LR
        SUPABASE["supabase/<br/>(client, server)"]
        AUTH_LIB["auth.ts"]
        CACHE["cache-strategy.ts"]
        UTILS["utils.ts"]
    end

    %% === データベース ===
    subgraph Database["🗄️ Database"]
        POSTGRES[(PostgreSQL<br/>Supabase)]
    end

    %% === 依存関係 ===
    HOME --> F_HOME
    WORK --> F_WORKS
    PROFILE --> F_USERS
    SEARCH --> F_SEARCH
    TRENDS --> F_TRENDS
    POST --> F_WORKS

    F_HOME --> SHARED
    F_WORKS --> SHARED
    F_USERS --> SHARED
    F_SEARCH --> SHARED
    F_TRENDS --> SHARED
    F_AUTH --> SHARED

    F_HOME --> AUTH_LIB
    F_WORKS --> AUTH_LIB
    F_USERS --> AUTH_LIB
    F_AUTH --> AUTH_LIB

    SHARED --> UI
    DOMAIN --> UI

    F_HOME --> SUPABASE
    F_WORKS --> SUPABASE
    F_USERS --> SUPABASE
    F_SEARCH --> SUPABASE
    F_TRENDS --> SUPABASE

    AUTH_LIB --> SUPABASE
    SUPABASE --> POSTGRES

    F_HOME --> CACHE
    F_WORKS --> CACHE
    F_USERS --> CACHE

    %% === スタイル ===
    classDef pagesStyle fill:#1e293b,stroke:#0ea5e9,stroke-width:3px,color:#fff
    classDef featuresStyle fill:#1c1917,stroke:#a855f7,stroke-width:3px,color:#fff
    classDef componentsStyle fill:#18181b,stroke:#f59e0b,stroke-width:3px,color:#fff
    classDef libStyle fill:#171717,stroke:#22d3ee,stroke-width:3px,color:#fff
    classDef dbStyle fill:#0c0a09,stroke:#84cc16,stroke-width:3px,color:#fff

    class HOME,WORK,PROFILE,SEARCH,TRENDS,POST pagesStyle
    class F_HOME,F_WORKS,F_USERS,F_SEARCH,F_TRENDS,F_AUTH,F_NOTIF featuresStyle
    class UI,SHARED,DOMAIN componentsStyle
    class SUPABASE,AUTH_LIB,CACHE,UTILS libStyle
    class POSTGRES dbStyle
```

### 1.2 データフロー（RSC + Server Actions）

```mermaid
sequenceDiagram
    participant User as 👤 User
    participant Page as 📄 Page (RSC)
    participant Loader as 🔄 Loader
    participant Action as ⚡ Server Action
    participant Cache as 💾 Cache
    participant DB as 🗄️ Database

    %% === 読み取りフロー ===
    User->>Page: ページアクセス
    Page->>Loader: データ取得リクエスト
    Loader->>Cache: キャッシュ確認

    alt キャッシュHit
        Cache-->>Loader: キャッシュデータ返却
    else キャッシュMiss
        Loader->>DB: クエリ実行
        DB-->>Loader: データ返却
        Loader->>Cache: キャッシュ保存
    end

    Loader-->>Page: データ返却
    Page-->>User: HTML表示

    %% === 書き込みフロー ===
    User->>Action: フォーム送信 (いいね, フォロー等)
    Action->>DB: データ更新
    DB-->>Action: 更新完了
    Action->>Cache: revalidateTag()
    Cache-->>Action: キャッシュ無効化完了
    Action-->>User: 更新結果返却
    User->>Page: ページ再読み込み (自動)
```

---

## 2. 共通インフラストラクチャ

### 2.1 認証システム（lib/auth.ts）

認証処理の全体フロー

```mermaid
sequenceDiagram
    participant Page as 📄 Page/Component
    participant Auth as 🔐 lib/auth.ts
    participant SB_Server as 🔧 lib/supabase/server.ts
    participant SB_Pool as 💾 lib/supabase/pool.ts
    participant Cookie as 🍪 Next.js Cookie
    participant API as ☁️ Supabase API

    Page->>Auth: getAuthenticatedUser()
    Auth->>SB_Server: createClient()
    SB_Server->>SB_Pool: getSharedClient()
    SB_Pool->>Cookie: await cookies()
    Cookie-->>SB_Pool: cookieStore
    SB_Pool->>API: supabase.auth.getUser()<br/>(JWT Token付き)
    API-->>SB_Pool: { user, error }
    SB_Pool-->>SB_Server: supabaseClient
    SB_Server-->>Auth: supabaseClient
    Auth->>API: supabase.auth.getUser()
    API-->>Auth: { data: { user }, error }

    alt ユーザー認証成功
        Auth-->>Page: User Object
    else 認証エラー
        Auth-->>Page: null
    end
```

**主要関数:**
- `getAuthenticatedUser()`: 基本認証確認（lib/auth.ts:6）
- `getPostUserProfile()`: プロフィール付き認証（lib/auth.ts:58）

### 2.2 Supabase接続（@supabase/ssr）

#### 接続フロー全体図

```mermaid
graph LR
    %% === クライアント側 ===
    subgraph NextJS["Next.js App (Server Component)"]
        RSC["📄 Page/Component"]
        COOKIE["🍪 Next.js Cookies"]
    end

    %% === アプリケーション層 ===
    subgraph AppLayer["lib/supabase/"]
        direction TB
        SERVER["server.ts<br/>createClient()"]
        POOL["pool.ts<br/>getSharedClient()"]
        SSR["@supabase/ssr<br/>createServerClient()"]
    end

    %% === 環境変数 ===
    subgraph ENV[".env.local"]
        URL["NEXT_PUBLIC_SUPABASE_URL"]
        KEY["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
    end

    %% === Supabaseクラウド ===
    subgraph Cloud["☁️ Supabase Cloud"]
        API["REST API"]
        AUTH["Auth Service"]
        RLS["Row Level Security"]
        PG[(PostgreSQL)]
    end

    %% === npm依存 ===
    subgraph NPM["📦 npm packages"]
        PKG1["@supabase/ssr<br/>v0.7.0"]
        PKG2["@supabase/supabase-js<br/>v2.56.0"]
    end

    %% === フロー ===
    RSC -->|"1. データ取得要求"| SERVER
    SERVER -->|"2. 共有クライアント取得"| POOL
    POOL -->|"3. Cookie読取"| COOKIE
    POOL -->|"4. Client生成"| SSR
    SSR -.->|"依存"| PKG1
    PKG1 -.->|"依存"| PKG2

    SSR -->|"5. 認証情報+URL"| API
    ENV -.->|"環境変数提供"| SSR

    API -->|"6. JWTトークン検証"| AUTH
    AUTH -->|"7. ユーザー権限確認"| RLS
    RLS -->|"8. 認可クエリ実行"| PG
    PG -->|"9. データ返却"| API
    API -->|"10. レスポンス"| RSC

    %% === スタイル ===
    classDef nextjs fill:#1e293b,stroke:#0ea5e9,stroke-width:3px,color:#fff
    classDef app fill:#1c1917,stroke:#a855f7,stroke-width:2px,color:#fff
    classDef env fill:#0c0a09,stroke:#fbbf24,stroke-width:2px,color:#fff
    classDef cloud fill:#0f172a,stroke:#10b981,stroke-width:3px,color:#fff
    classDef npm fill:#171717,stroke:#ef4444,stroke-width:2px,color:#fff

    class RSC,COOKIE nextjs
    class SERVER,POOL,SSR app
    class URL,KEY env
    class API,AUTH,RLS,PG cloud
    class PKG1,PKG2 npm
```

#### 詳細シーケンス

```mermaid
sequenceDiagram
    participant RSC as 📄 Server Component
    participant Server as 🔧 server.ts
    participant Pool as 💾 pool.ts
    participant Cookie as 🍪 Next.js Cookie
    participant Client as 📦 createServerClient
    participant API as ☁️ Supabase API
    participant DB as 🗄️ PostgreSQL

    RSC->>Server: createClient()
    Server->>Pool: getSharedClient()
    Pool->>Cookie: await cookies()
    Cookie-->>Pool: cookieStore
    Pool->>Client: createServerClient(URL, KEY, { cookies })

    Note over Client: getAll()でCookie取得<br/>sb-access-token等

    Client->>API: GET /rest/v1/...<br/>Authorization: Bearer {JWT}

    Note over API: JWTトークンを検証<br/>有効期限・署名チェック

    API->>DB: SELECT * FROM ...<br/>WHERE auth.uid() = xxx

    Note over DB: RLS (Row Level Security)<br/>により自動的にユーザー権限でフィルタ

    DB-->>API: データ返却
    API-->>Client: JSONレスポンス
    Client-->>Pool: supabaseClient
    Pool-->>Server: supabaseClient
    Server-->>RSC: supabaseClient
```

**主要ファイル:**
- `lib/supabase/server.ts`: クライアント作成エントリポイント
- `lib/supabase/pool.ts`: 共有クライアントプール（パフォーマンス最適化）
- `lib/supabase/client.ts`: ブラウザ用クライアント

**接続先情報（.env.local）:**
```
NEXT_PUBLIC_SUPABASE_URL=https://auemhlvikaveglwxordt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...（JWTトークン）
```

**重要ポイント:**
1. **Supabase特有**: 汎用HTTPクライアントではなく、Supabase専用
2. **Cookie自動管理**: Next.jsのCookieから認証情報を自動取得
3. **RLS連携**: JWTトークンでユーザー権限が自動判定される
4. **SSR対応**: Server ComponentsでCookieを正しく扱うための設計

### 2.3 ユーティリティ（lib/utils）

```mermaid
graph TD
    %% === Components ===
    subgraph Components["使用側コンポーネント"]
        SPINNER["LoadingSpinner"]
        BUTTON["Button"]
        OTHER["その他UI"]
    end

    %% === lib/utils ===
    subgraph Utils["lib/utils.ts"]
        CN["cn()"]
        FORMAT["formatDistanceToNow()"]
    end

    %% === npm packages ===
    subgraph NPM["外部パッケージ"]
        CLSX["clsx"]
        TWMERGE["tailwind-merge"]
        DATE_FNS["date-fns"]
    end

    %% === 依存関係 ===
    SPINNER --> CN
    BUTTON --> CN
    OTHER --> CN
    OTHER --> FORMAT

    CN --> CLSX
    CN --> TWMERGE
    FORMAT --> DATE_FNS

    %% === スタイル ===
    classDef comp fill:#18181b,stroke:#f59e0b,stroke-width:2px,color:#fff
    classDef util fill:#422006,stroke:#fbbf24,stroke-width:2px,color:#fff
    classDef npm fill:#450a0a,stroke:#ef4444,stroke-width:2px,color:#fff

    class SPINNER,BUTTON,OTHER comp
    class CN,FORMAT util
    class CLSX,TWMERGE,DATE_FNS npm
```

**主要関数:**
- `cn()`: Tailwindクラスのマージユーティリティ
- `formatDistanceToNow()`: 相対時間表示

---

## 3. ホームページ

**ファイルパス:** `app/app/page.tsx`

### 3.1 全体構造

ホームページは以下の5つのSuspenseコンポーネントで構成されています。

```mermaid
graph TD
    %% === ページファイル ===
    subgraph PAGE["app/app/page.tsx"]
        HOMEPAGE["HomePage()"]
    end

    %% === 認証ファイル ===
    subgraph AUTH_FILE["lib/auth.ts"]
        GET_AUTH_USER["getAuthenticatedUser()"]
    end

    %% === Suspense Components ===
    subgraph CONTINUE_FILE["ContinueReadingSuspense.tsx"]
        CONTINUE_READ["ContinueReadingSuspense()"]
    end

    subgraph POSTGRES_FILE["PostgreSQLRecommendationsSuspense.tsx"]
        POSTGRES_REC["PostgreSQLRecommendationsSuspense()"]
    end

    subgraph NOVELS_FILE["NovelsSuspense.tsx"]
        NOVELS["NovelsSuspense()"]
    end

    subgraph ESSAYS_FILE["EssaysSuspense.tsx"]
        ESSAYS["EssaysSuspense()"]
    end

    subgraph TAGS_FILE["UserTagsSuspense.tsx"]
        USER_TAGS["UserTagsSuspense()"]
    end

    %% === React ===
    subgraph REACT["react"]
        SUSPENSE["Suspense"]
    end

    %% === 依存関係 ===
    HOMEPAGE --> GET_AUTH_USER
    HOMEPAGE --> SUSPENSE
    HOMEPAGE --> CONTINUE_READ
    HOMEPAGE --> POSTGRES_REC
    HOMEPAGE --> NOVELS
    HOMEPAGE --> ESSAYS
    HOMEPAGE --> USER_TAGS

    %% === スタイル ===
    classDef page fill:#1e293b,stroke:#0ea5e9,stroke-width:3px,color:#fff
    classDef auth fill:#0f172a,stroke:#10b981,stroke-width:2px,color:#fff
    classDef feature fill:#1c1917,stroke:#a855f7,stroke-width:2px,color:#fff
    classDef npm fill:#450a0a,stroke:#ef4444,stroke-width:2px,color:#fff

    class HOMEPAGE page
    class GET_AUTH_USER auth
    class CONTINUE_READ,POSTGRES_REC,NOVELS,ESSAYS,USER_TAGS feature
    class SUSPENSE npm
```

---

### 3.2 ContinueReadingSuspense

**機能:** ユーザーが途中まで読んだ作品を表示

```mermaid
graph TD
    %% === Component File ===
    subgraph CONTINUE_SUSPENSE["ContinueReadingSuspense.tsx"]
        CONTINUE_SUSPENSE_FUNC["ContinueReadingSuspense()"]
    end

    %% === Section ===
    subgraph CONTINUE_SECTION["sections/ContinueReadingSection.tsx"]
        CONTINUE_SECTION_FUNC["ContinueReadingSection()"]
    end

    %% === Works Loader ===
    subgraph WORKS_LOADER["features/works/server/loader.ts"]
        GET_CONTINUE["getContinueReadingWorks()"]
        GET_LIKES_BM["getUserLikesAndBookmarks()"]
    end

    %% === Supabase ===
    subgraph SB_SERVER["lib/supabase/server.ts"]
        CREATE_CLIENT["createClient()"]
    end

    subgraph SB_POOL["lib/supabase/pool.ts"]
        GET_SHARED["getSharedClient()"]
    end

    %% === React ===
    subgraph REACT["react"]
        CACHE_R["cache()"]
    end

    %% === 依存関係 ===
    CONTINUE_SUSPENSE_FUNC --> GET_CONTINUE
    CONTINUE_SUSPENSE_FUNC --> GET_LIKES_BM
    CONTINUE_SUSPENSE_FUNC --> CONTINUE_SECTION_FUNC

    GET_CONTINUE --> CREATE_CLIENT
    GET_LIKES_BM --> CREATE_CLIENT

    CREATE_CLIENT --> GET_SHARED
    GET_SHARED --> CACHE_R

    %% === スタイル ===
    classDef component fill:#1c1917,stroke:#a855f7,stroke-width:2px,color:#fff
    classDef section fill:#18181b,stroke:#f59e0b,stroke-width:2px,color:#fff
    classDef loader fill:#422006,stroke:#fbbf24,stroke-width:2px,color:#fff
    classDef sbServer fill:#171717,stroke:#22d3ee,stroke-width:2px,color:#fff
    classDef sbPool fill:#0c0a09,stroke:#84cc16,stroke-width:2px,color:#fff
    classDef npm fill:#450a0a,stroke:#ef4444,stroke-width:2px,color:#fff

    class CONTINUE_SUSPENSE_FUNC component
    class CONTINUE_SECTION_FUNC section
    class GET_CONTINUE,GET_LIKES_BM loader
    class CREATE_CLIENT sbServer
    class GET_SHARED sbPool
    class CACHE_R npm
```

**データフロー:**
1. `getContinueReadingWorks()`: 読書進捗がある作品を取得
2. `getUserLikesAndBookmarks()`: ユーザーのいいね・ブックマーク状態を取得
3. `ContinueReadingSection`: 取得したデータをUIに渡す

---

### 3.3 PostgreSQLRecommendationsSuspense

**機能:** PostgreSQL推薦システムによるパーソナライズ推薦

```mermaid
graph TD
    %% === Component Files ===
    subgraph POSTGRES_SUSPENSE["PostgreSQLRecommendationsSuspense.tsx"]
        POSTGRES_MAIN["PostgreSQLRecommendationsSuspense()"]
        POSTGRES_CONTENT["PostgreSQLRecommendationsContent()"]
        GET_USER_INTERACTION["getUserInteractionData()"]
        GET_USER_PREF["getUserPreferences()"]
    end

    %% === Section ===
    subgraph POSTGRES_SECTION["sections/PostgreSQLRecommendationsSection.tsx"]
        POSTGRES_SEC_FUNC["PostgreSQLRecommendationsSection()"]
    end

    %% === Home Server ===
    subgraph HOME_SERVER["features/home/server/postgres-recommendations.ts"]
        GET_POSTGRES_REC["getPostgreSQLRecommendations()"]
    end

    %% === Supabase ===
    subgraph SB_SERVER_P["lib/supabase/server.ts"]
        CREATE_CLIENT_P["createClient()"]
    end

    %% === Database RPC ===
    subgraph DB_RPC["Supabase RPC"]
        GET_USER_PREF_CACHE["get_user_preferences_cache()"]
        POSTGRES_RECOMMEND_FUNC["recommend_works_postgres()"]
    end

    %% === React ===
    subgraph REACT_P["react"]
        SUSPENSE_P["Suspense"]
    end

    %% === 依存関係 ===
    POSTGRES_MAIN --> SUSPENSE_P
    POSTGRES_MAIN --> POSTGRES_CONTENT

    POSTGRES_CONTENT --> GET_POSTGRES_REC
    POSTGRES_CONTENT --> GET_USER_INTERACTION
    POSTGRES_CONTENT --> GET_USER_PREF
    POSTGRES_CONTENT --> POSTGRES_SEC_FUNC

    GET_USER_INTERACTION --> CREATE_CLIENT_P
    GET_USER_PREF --> CREATE_CLIENT_P
    GET_USER_PREF --> GET_USER_PREF_CACHE

    GET_POSTGRES_REC --> CREATE_CLIENT_P
    GET_POSTGRES_REC --> POSTGRES_RECOMMEND_FUNC

    %% === スタイル ===
    classDef component fill:#1c1917,stroke:#a855f7,stroke-width:2px,color:#fff
    classDef section fill:#18181b,stroke:#f59e0b,stroke-width:2px,color:#fff
    classDef loader fill:#422006,stroke:#fbbf24,stroke-width:2px,color:#fff
    classDef sbServer fill:#171717,stroke:#22d3ee,stroke-width:2px,color:#fff
    classDef db fill:#0c0a09,stroke:#84cc16,stroke-width:2px,color:#fff
    classDef npm fill:#450a0a,stroke:#ef4444,stroke-width:2px,color:#fff

    class POSTGRES_MAIN,POSTGRES_CONTENT,GET_USER_INTERACTION,GET_USER_PREF component
    class POSTGRES_SEC_FUNC section
    class GET_POSTGRES_REC loader
    class CREATE_CLIENT_P sbServer
    class GET_USER_PREF_CACHE,POSTGRES_RECOMMEND_FUNC db
    class SUSPENSE_P npm
```

**データフロー:**
1. `getUserInteractionData()`: いいね・ブックマーク・読書進捗を並列取得
2. `getUserPreferences()`: ユーザーの嗜好（カテゴリ・タグ）をRPCで取得
3. `getPostgreSQLRecommendations()`: PostgreSQL推薦RPCを実行
4. 動的タイトル生成: 嗜好データがあれば「あなたの好み」、なければ「あなたへのおすすめ」

---

### 3.4 UserTagsSuspense

**機能:** ユーザーの行動履歴に基づくタグ推薦

```mermaid
graph TD
    %% === Component File ===
    subgraph TAGS_SUSPENSE["UserTagsSuspense.tsx"]
        TAGS_MAIN["UserTagsSuspense()"]
        TAGS_DATA["UserTagsData()"]
        GET_USER_TAGS_FUNC["getUserTags()"]
    end

    %% === Section ===
    subgraph TAGS_SECTION["sections/UserTagsSection.tsx"]
        TAGS_SEC_FUNC["UserTagsSection()"]
    end

    %% === Home Server ===
    subgraph TAGS_LOADER["features/home/server/userTagsLoader.ts"]
        GET_CACHED_TAGS["getCachedUserTagsRecommendations()"]
        GET_USER_TAGS_REC["getUserTagsRecommendations()"]
        GET_WORKS_BY_TAG["getWorksByTag()"]
    end

    %% === Supabase ===
    subgraph SB_SERVER_T["lib/supabase/server.ts"]
        CREATE_CLIENT_T["createClient()"]
    end

    %% === React ===
    subgraph REACT_T["react"]
        SUSPENSE_T["Suspense"]
        CACHE_T["cache()"]
    end

    %% === 依存関係 ===
    TAGS_MAIN --> SUSPENSE_T
    TAGS_MAIN --> TAGS_DATA

    TAGS_DATA --> GET_USER_TAGS_FUNC
    TAGS_DATA --> GET_CACHED_TAGS
    TAGS_DATA --> TAGS_SEC_FUNC

    GET_USER_TAGS_FUNC --> CREATE_CLIENT_T

    GET_CACHED_TAGS --> GET_USER_TAGS_REC
    GET_USER_TAGS_REC --> GET_WORKS_BY_TAG
    GET_WORKS_BY_TAG --> CREATE_CLIENT_T
    GET_WORKS_BY_TAG --> CACHE_T

    %% === スタイル ===
    classDef component fill:#1c1917,stroke:#a855f7,stroke-width:2px,color:#fff
    classDef section fill:#18181b,stroke:#f59e0b,stroke-width:2px,color:#fff
    classDef loader fill:#422006,stroke:#fbbf24,stroke-width:2px,color:#fff
    classDef sbServer fill:#171717,stroke:#22d3ee,stroke-width:2px,color:#fff
    classDef npm fill:#450a0a,stroke:#ef4444,stroke-width:2px,color:#fff

    class TAGS_MAIN,TAGS_DATA,GET_USER_TAGS_FUNC component
    class TAGS_SEC_FUNC section
    class GET_CACHED_TAGS,GET_USER_TAGS_REC,GET_WORKS_BY_TAG loader
    class CREATE_CLIENT_T sbServer
    class SUSPENSE_T,CACHE_T npm
```

**データフロー:**
1. `getUserTags()`: ユーザーのいいね・ブックマーク・進捗を取得
2. `getCachedUserTagsRecommendations()`: タグベース推薦（キャッシュ付き）
3. `getUserTagsRecommendations()`: ユーザーの行動からタグを抽出し、各タグで作品を取得
4. `getWorksByTag()`: 各タグごとに作品を取得（`cache()`でメモ化）

---

### 3.5 NovelsSuspense

**機能:** 小説カテゴリの作品一覧

```mermaid
graph TD
    %% === Component File ===
    subgraph NOVELS_SUSPENSE["NovelsSuspense.tsx"]
        NOVELS_FUNC["NovelsSuspense()"]
    end

    %% === Section ===
    subgraph NOVELS_SECTION["sections/NovelsSection.tsx"]
        NOVELS_SEC_FUNC["NovelsSection()"]
    end

    %% === Works Loader ===
    subgraph WORKS_LOADER_N["features/works/server/loader.ts"]
        GET_WORKS_CAT["getWorksByCategoriesWithSort()"]
        GET_LIKES_N["getUserLikesAndBookmarks()"]
        GET_PROGRESS_N["getUserReadingProgress()"]
    end

    %% === Supabase ===
    subgraph SB_SERVER_N["lib/supabase/server.ts"]
        CREATE_CLIENT_N["createClient()"]
    end

    %% === React ===
    subgraph REACT_N["react"]
        CACHE_N["cache()"]
    end

    %% === 依存関係 ===
    NOVELS_FUNC --> GET_WORKS_CAT
    NOVELS_FUNC --> GET_LIKES_N
    NOVELS_FUNC --> GET_PROGRESS_N
    NOVELS_FUNC --> NOVELS_SEC_FUNC

    GET_WORKS_CAT --> CREATE_CLIENT_N
    GET_LIKES_N --> CREATE_CLIENT_N
    GET_PROGRESS_N --> CREATE_CLIENT_N

    CREATE_CLIENT_N -.->|cache| CACHE_N

    %% === スタイル ===
    classDef component fill:#1c1917,stroke:#a855f7,stroke-width:2px,color:#fff
    classDef section fill:#18181b,stroke:#f59e0b,stroke-width:2px,color:#fff
    classDef loader fill:#422006,stroke:#fbbf24,stroke-width:2px,color:#fff
    classDef sbServer fill:#171717,stroke:#22d3ee,stroke-width:2px,color:#fff
    classDef npm fill:#450a0a,stroke:#ef4444,stroke-width:2px,color:#fff

    class NOVELS_FUNC component
    class NOVELS_SEC_FUNC section
    class GET_WORKS_CAT,GET_LIKES_N,GET_PROGRESS_N loader
    class CREATE_CLIENT_N sbServer
    class CACHE_N npm
```

**データフロー:**
1. `getWorksByCategoriesWithSort(['小説'], 'views', 9)`: 小説を閲覧数順で9件取得
2. ユーザーがいる場合: いいね・ブックマーク・進捗を並列取得
3. `NovelsSection`: UIに渡す

---

### 3.6 EssaysSuspense

**機能:** エッセイカテゴリの作品一覧

```mermaid
graph TD
    %% === Component File ===
    subgraph ESSAYS_SUSPENSE["EssaysSuspense.tsx"]
        ESSAYS_FUNC["EssaysSuspense()"]
    end

    %% === Section ===
    subgraph ESSAYS_SECTION["sections/EssaysSection.tsx"]
        ESSAYS_SEC_FUNC["EssaysSection()"]
    end

    %% === Works Loader ===
    subgraph WORKS_LOADER_E["features/works/server/loader.ts"]
        GET_WORKS_CAT_E["getWorksByCategoriesWithSort()"]
        GET_LIKES_E["getUserLikesAndBookmarks()"]
        GET_PROGRESS_E["getUserReadingProgress()"]
    end

    %% === Supabase ===
    subgraph SB_SERVER_E["lib/supabase/server.ts"]
        CREATE_CLIENT_E["createClient()"]
    end

    %% === React ===
    subgraph REACT_E["react"]
        CACHE_E["cache()"]
    end

    %% === 依存関係 ===
    ESSAYS_FUNC --> GET_WORKS_CAT_E
    ESSAYS_FUNC --> GET_LIKES_E
    ESSAYS_FUNC --> GET_PROGRESS_E
    ESSAYS_FUNC --> ESSAYS_SEC_FUNC

    GET_WORKS_CAT_E --> CREATE_CLIENT_E
    GET_LIKES_E --> CREATE_CLIENT_E
    GET_PROGRESS_E --> CREATE_CLIENT_E

    CREATE_CLIENT_E -.->|cache| CACHE_E

    %% === スタイル ===
    classDef component fill:#1c1917,stroke:#a855f7,stroke-width:2px,color:#fff
    classDef section fill:#18181b,stroke:#f59e0b,stroke-width:2px,color:#fff
    classDef loader fill:#422006,stroke:#fbbf24,stroke-width:2px,color:#fff
    classDef sbServer fill:#171717,stroke:#22d3ee,stroke-width:2px,color:#fff
    classDef npm fill:#450a0a,stroke:#ef4444,stroke-width:2px,color:#fff

    class ESSAYS_FUNC component
    class ESSAYS_SEC_FUNC section
    class GET_WORKS_CAT_E,GET_LIKES_E,GET_PROGRESS_E loader
    class CREATE_CLIENT_E sbServer
    class CACHE_E npm
```

**データフロー:**
1. `getWorksByCategoriesWithSort(['エッセイ'], 'views', 9)`: エッセイを閲覧数順で9件取得
2. ユーザーがいる場合: いいね・ブックマーク・進捗を並列取得
3. `EssaysSection`: UIに渡す

---

### 3.7 認証フロー

```mermaid
sequenceDiagram
    participant Page as HomePage
    participant Auth as getAuthenticatedUser
    participant Server as createClient
    participant Pool as getSharedClient
    participant Cookie as cookies()
    participant SSR as createServerClient
    participant API as Supabase API

    Page->>Auth: 認証確認
    Auth->>Server: createClient()
    Server->>Pool: getSharedClient()
    Pool->>Cookie: await cookies()
    Cookie-->>Pool: cookieStore
    Pool->>SSR: createServerClient(URL, KEY, {cookies})
    SSR->>API: auth.getUser() (JWT Token)
    API-->>SSR: { user, session }
    SSR-->>Pool: supabaseClient
    Pool-->>Server: supabaseClient
    Server-->>Auth: supabaseClient
    Auth->>API: supabase.auth.getUser()
    API-->>Auth: User | null
    Auth-->>Page: User | null
```

**フロー詳細:**
1. `HomePage()` → `getAuthenticatedUser()`: 認証確認
2. `createClient()` → `getSharedClient()`: 共有クライアント取得（`cache()`でメモ化）
3. `cookies()`: Next.jsからCookieを取得
4. `createServerClient()`: Supabase SSRクライアント作成（JWT Token付き）
5. `auth.getUser()`: Supabase APIで認証確認
6. 返り値: `User | null`

---

### 3.8 UI依存関係

```mermaid
graph TD
    %% === Shared Components ===
    subgraph SPINNER_FILE["components/shared/LoadingSpinner.tsx"]
        SPINNER["LoadingSpinner()"]
    end

    %% === Utils ===
    subgraph UTILS_FILE["lib/utils.ts"]
        CN["cn()"]
    end

    %% === External Packages ===
    subgraph CLSX_PKG["clsx"]
        CLSX["clsx()"]
    end

    subgraph TW_MERGE["tailwind-merge"]
        TW_M["twMerge()"]
    end

    %% === 依存関係 ===
    SPINNER --> CN
    CN --> CLSX
    CN --> TW_M

    %% === スタイル ===
    classDef comp fill:#18181b,stroke:#f59e0b,stroke-width:2px,color:#fff
    classDef util fill:#713f12,stroke:#facc15,stroke-width:2px,color:#fff
    classDef npm fill:#450a0a,stroke:#ef4444,stroke-width:2px,color:#fff

    class SPINNER comp
    class CN util
    class CLSX,TW_M npm
```

**関数:**
- `cn()`: Tailwind CSSクラスのマージユーティリティ
  - `clsx()`: 条件付きクラス結合
  - `twMerge()`: Tailwindクラスの競合解決

---

## 4. 作品詳細ページ

**ファイルパス:** `app/app/works/[id]/page.tsx`

### 4.1 全体構造（関数レベル）

```mermaid
graph TD
    %% === ページファイル ===
    subgraph PAGE["📄 app/app/works/[id]/page.tsx"]
        WORK_PAGE["WorkDetailPage()"]
        GEN_META["generateMetadata()"]
    end

    %% === Sections ===
    subgraph BASIC_INFO["⚙️ features/works/sections/WorkBasicInfo.tsx"]
        BASIC_INFO_FUNC["WorkBasicInfo()"]
    end

    subgraph CONTENT_PROG["⚙️ features/works/sections/WorkContentWithProgress.tsx"]
        CONTENT_PROG_FUNC["WorkContentWithProgress()"]
    end

    subgraph USER_ACTIONS["⚙️ features/works/sections/WorkUserActions.tsx"]
        USER_ACTIONS_FUNC["WorkUserActions()"]
    end

    subgraph COMMENTS_SEC["⚙️ features/works/sections/WorkDetailCommentsSection.tsx"]
        COMMENTS_FUNC["WorkDetailCommentsSection()"]
    end

    %% === Sub-Sections ===
    subgraph HEADER_SEC["⚙️ features/works/sections/WorkDetailHeaderSection.tsx"]
        HEADER_FUNC["WorkDetailHeaderSection()"]
    end

    %% === Works Server Loader ===
    subgraph WORKS_LOADER["🔄 features/works/server/loader.ts"]
        GET_WORK_BY_ID["getWorkById()"]
        GET_WORK_META["getWorkMetadata()"]
        GET_USER_INTERACTIONS["getUserWorkInteractions()"]
    end

    %% === Supabase Server ===
    subgraph SB_SERVER["🔧 lib/supabase/server.ts"]
        CREATE_SB_CLIENT["createClient()"]
    end

    %% === Supabase Pool ===
    subgraph SB_POOL["💾 lib/supabase/pool.ts"]
        GET_SB_SHARED["getSharedClient()"]
    end

    %% === React ===
    subgraph REACT["📦 react"]
        SUSPENSE_R["Suspense"]
        CACHE_R["cache()"]
    end

    %% === Supabase SSR ===
    subgraph SSR["📦 @supabase/ssr"]
        CREATE_SERVER["createServerClient()"]
    end

    %% === 依存関係（Page → Sections） ===
    WORK_PAGE --> GET_WORK_BY_ID
    WORK_PAGE --> CREATE_SB_CLIENT
    WORK_PAGE --> SUSPENSE_R
    WORK_PAGE --> BASIC_INFO_FUNC
    WORK_PAGE --> CONTENT_PROG_FUNC
    WORK_PAGE --> USER_ACTIONS_FUNC
    WORK_PAGE --> COMMENTS_FUNC

    GEN_META --> GET_WORK_META

    %% === Sections → Sub-Sections ===
    BASIC_INFO_FUNC --> HEADER_FUNC

    %% === Sections → Server Loader ===
    USER_ACTIONS_FUNC --> GET_USER_INTERACTIONS

    %% === Server Loader → Supabase ===
    GET_WORK_BY_ID --> CREATE_SB_CLIENT
    GET_WORK_META --> CREATE_SB_CLIENT
    GET_USER_INTERACTIONS --> CREATE_SB_CLIENT

    %% === Supabase Client Chain ===
    CREATE_SB_CLIENT --> GET_SB_SHARED
    GET_SB_SHARED --> CREATE_SERVER
    GET_SB_SHARED --> CACHE_R

    %% === スタイル ===
    classDef page fill:#1e293b,stroke:#0ea5e9,stroke-width:3px,color:#fff
    classDef section fill:#1c1917,stroke:#a855f7,stroke-width:2px,color:#fff
    classDef loader fill:#422006,stroke:#fbbf24,stroke-width:2px,color:#fff
    classDef sbServer fill:#171717,stroke:#22d3ee,stroke-width:2px,color:#fff
    classDef sbPool fill:#0c0a09,stroke:#84cc16,stroke-width:2px,color:#fff
    classDef npm fill:#450a0a,stroke:#ef4444,stroke-width:2px,color:#fff

    class WORK_PAGE,GEN_META page
    class BASIC_INFO_FUNC,CONTENT_PROG_FUNC,USER_ACTIONS_FUNC,COMMENTS_FUNC,HEADER_FUNC section
    class GET_WORK_BY_ID,GET_WORK_META,GET_USER_INTERACTIONS loader
    class CREATE_SB_CLIENT sbServer
    class GET_SB_SHARED sbPool
    class SUSPENSE_R,CACHE_R,CREATE_SERVER npm
```

### 4.2 データローダー詳細

**features/works/server/loader.ts** の主要関数：

```mermaid
graph TD
    subgraph "features/works/server/loader.ts"
        GET_WORKS["getWorks()"]
        GET_WORKS_BY_CAT["getWorksByCategory()"]
        GET_WORKS_WITH_SORT["getWorksByCategoriesWithSort()"]
        GET_LIKES["getUserLikesAndBookmarks()"]
        GET_PROGRESS["getUserReadingProgress()"]
        GET_CONTINUE["getContinueReadingWorks()"]
        GET_HISTORY["getUserReadingHistory()"]
        CREATE_CACHE["createCachedWorkData()"]
        GET_BY_ID["getWorkById()"]
        GET_INTERACTIONS["getUserWorkInteractions()"]
        GET_METADATA["getWorkMetadata()"]
    end

    subgraph "lib/supabase/"
        CLIENT["createClient()"]
    end

    %% === 依存関係 ===
    GET_WORKS --> CLIENT
    GET_WORKS_BY_CAT --> CLIENT
    GET_WORKS_WITH_SORT --> CLIENT
    GET_LIKES --> CLIENT
    GET_PROGRESS --> CLIENT
    GET_CONTINUE --> CLIENT
    GET_HISTORY --> CLIENT
    CREATE_CACHE --> CLIENT
    GET_BY_ID --> CLIENT
    GET_INTERACTIONS --> CLIENT
    GET_METADATA --> CLIENT

    %% === スタイル ===
    classDef loader fill:#0c0a09,stroke:#84cc16,stroke-width:2px,color:#fff
    classDef lib fill:#171717,stroke:#22d3ee,stroke-width:2px,color:#fff

    class GET_WORKS,GET_WORKS_BY_CAT,GET_WORKS_WITH_SORT,GET_LIKES,GET_PROGRESS,GET_CONTINUE,GET_HISTORY,CREATE_CACHE,GET_BY_ID,GET_INTERACTIONS,GET_METADATA loader
    class CLIENT lib
```

---

## 5. 検索ページ

**ファイルパス:** `app/app/search/page.tsx`

### 5.1 全体構造

検索ページは3つのSectionで構成されています。

```mermaid
graph TD
    %% === ページファイル ===
    subgraph SEARCH_PAGE["app/app/search/page.tsx"]
        SEARCH_PAGE_FUNC["SearchPage()"]
    end

    %% === Sections ===
    subgraph HEADER_SEC["sections/SearchHeaderSection.tsx"]
        HEADER_FUNC["SearchHeaderSection()"]
    end

    subgraph FILTERS_SEC["sections/SearchFiltersSection.tsx"]
        FILTERS_FUNC["SearchFiltersSection()"]
    end

    subgraph RESULTS_SEC["sections/SearchResultsSection.tsx"]
        RESULTS_FUNC["SearchResultsSection()"]
    end

    %% === React ===
    subgraph REACT_S["react"]
        SUSPENSE_S["Suspense"]
    end

    %% === Shared Components ===
    subgraph SPINNER_S["components/shared/LoadingSpinner.tsx"]
        SPINNER_FUNC["LoadingSpinner()"]
    end

    %% === 依存関係 ===
    SEARCH_PAGE_FUNC --> SUSPENSE_S
    SEARCH_PAGE_FUNC --> SPINNER_FUNC
    SEARCH_PAGE_FUNC --> HEADER_FUNC
    SEARCH_PAGE_FUNC --> FILTERS_FUNC
    SEARCH_PAGE_FUNC --> RESULTS_FUNC

    %% === スタイル ===
    classDef page fill:#1e293b,stroke:#0ea5e9,stroke-width:3px,color:#fff
    classDef section fill:#1c1917,stroke:#a855f7,stroke-width:2px,color:#fff
    classDef comp fill:#18181b,stroke:#f59e0b,stroke-width:2px,color:#fff
    classDef npm fill:#450a0a,stroke:#ef4444,stroke-width:2px,color:#fff

    class SEARCH_PAGE_FUNC page
    class HEADER_FUNC,FILTERS_FUNC,RESULTS_FUNC section
    class SPINNER_FUNC comp
    class SUSPENSE_S npm
```

**主要機能:**
- クエリパラメータベースの検索（`?q=keyword&category=小説&sort=views`）
- 作品・ユーザー両方の検索結果を表示
- フィルター機能（カテゴリ、並び順、タイプ）
- ページネーション

---

### 5.2 SearchResultsSection

**機能:** 検索結果の取得と表示

```mermaid
graph TD
    %% === Section ===
    subgraph RESULTS_SECTION["sections/SearchResultsSection.tsx"]
        RESULTS_SECTION_FUNC["SearchResultsSection()"]
    end

    %% === Server Actions ===
    subgraph SEARCH_ACTIONS["server/actions.ts"]
        GET_SEARCH_RESULTS["getSearchResults()"]
        EXECUTE_SEARCH["executeSearch()"]
        UPDATE_FILTERS["updateSearchFilters()"]
    end

    %% === Server Loader ===
    subgraph SEARCH_LOADER["server/loader.ts"]
        SEARCH_WORKS["searchWorks()"]
    end

    %% === Components ===
    subgraph USER_WRAPPER["components/UserResultsWrapper.tsx"]
        USER_WRAPPER_FUNC["UserResultsWrapper()"]
    end

    %% === Leaf Components ===
    subgraph EMPTY_RESULTS["leaf/EmptyResults.tsx"]
        EMPTY_FUNC["EmptyResults()"]
    end

    subgraph PAGINATION["leaf/ResultsPagination.tsx"]
        PAGINATION_FUNC["ResultsPagination()"]
    end

    subgraph RELATED["leaf/RelatedSearches.tsx"]
        RELATED_FUNC["RelatedSearches()"]
    end

    %% === Domain Components ===
    subgraph TRACKED_CARD["components/domain/TrackedWorkCard.tsx"]
        TRACKED_CARD_FUNC["TrackedWorkCard()"]
    end

    subgraph USER_CARD["features/users/leaf/UserCard.tsx"]
        USER_CARD_FUNC["UserCard()"]
    end

    %% === Supabase ===
    subgraph SB_SERVER_SEARCH["lib/supabase/server.ts"]
        CREATE_CLIENT_SEARCH["createClient()"]
    end

    %% === 依存関係 ===
    RESULTS_SECTION_FUNC --> GET_SEARCH_RESULTS
    RESULTS_SECTION_FUNC --> USER_WRAPPER_FUNC
    RESULTS_SECTION_FUNC --> EMPTY_FUNC
    RESULTS_SECTION_FUNC --> PAGINATION_FUNC
    RESULTS_SECTION_FUNC --> RELATED_FUNC
    RESULTS_SECTION_FUNC --> TRACKED_CARD_FUNC

    GET_SEARCH_RESULTS --> SEARCH_WORKS
    SEARCH_WORKS --> CREATE_CLIENT_SEARCH

    USER_WRAPPER_FUNC --> USER_CARD_FUNC

    %% === スタイル ===
    classDef section fill:#1c1917,stroke:#a855f7,stroke-width:2px,color:#fff
    classDef action fill:#422006,stroke:#fbbf24,stroke-width:2px,color:#fff
    classDef loader fill:#713f12,stroke:#facc15,stroke-width:2px,color:#fff
    classDef component fill:#18181b,stroke:#f59e0b,stroke-width:2px,color:#fff
    classDef leaf fill:#27272a,stroke:#fde047,stroke-width:2px,color:#fff
    classDef sbServer fill:#171717,stroke:#22d3ee,stroke-width:2px,color:#fff

    class RESULTS_SECTION_FUNC section
    class GET_SEARCH_RESULTS,EXECUTE_SEARCH,UPDATE_FILTERS action
    class SEARCH_WORKS loader
    class USER_WRAPPER_FUNC,TRACKED_CARD_FUNC,USER_CARD_FUNC component
    class EMPTY_FUNC,PAGINATION_FUNC,RELATED_FUNC leaf
    class CREATE_CLIENT_SEARCH sbServer
```

**データフロー:**
1. `getSearchResults(query, filters, page)`: 検索リクエスト
2. `searchWorks()`: 作品検索をSupabaseで実行
3. 結果を以下に分配:
   - 作者: `UserResultsWrapper` → `UserCard`
   - 作品: `TrackedWorkCard`（クリック追跡機能付き）
   - 空結果: `EmptyResults`
   - 関連検索: `RelatedSearches`
4. ページネーション: `ResultsPagination`

---

### 5.3 SearchFiltersSection

**機能:** フィルター選択UI

```mermaid
graph TD
    %% === Section ===
    subgraph FILTERS_SECTION["sections/SearchFiltersSection.tsx"]
        FILTERS_SECTION_FUNC["SearchFiltersSection()"]
    end

    %% === Leaf ===
    subgraph FILTER_CHIPS["leaf/FilterChips.tsx"]
        FILTER_CHIPS_FUNC["FilterChips()"]
    end

    subgraph SEARCH_TABS["leaf/SearchTabs.tsx"]
        SEARCH_TABS_FUNC["SearchTabs()"]
    end

    %% === 依存関係 ===
    FILTERS_SECTION_FUNC --> FILTER_CHIPS_FUNC
    FILTERS_SECTION_FUNC --> SEARCH_TABS_FUNC

    %% === スタイル ===
    classDef section fill:#1c1917,stroke:#a855f7,stroke-width:2px,color:#fff
    classDef leaf fill:#27272a,stroke:#fde047,stroke-width:2px,color:#fff

    class FILTERS_SECTION_FUNC section
    class FILTER_CHIPS_FUNC,SEARCH_TABS_FUNC leaf
```

**フィルター項目:**
- **カテゴリ**: 全て / 小説 / エッセイ / 詩
- **並び順**: 関連度 / 閲覧数 / いいね数 / 新着順
- **タイプ**: 全て / 作品のみ / ユーザーのみ

---

### 5.4 検索データフロー

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant Page as SearchPage
    participant Results as SearchResultsSection
    participant Actions as getSearchResults
    participant Loader as searchWorks
    participant DB as Supabase Database

    User->>Page: ?q=keyword&category=小説
    Page->>Results: SearchResultsSection(query, filters, page)
    Results->>Actions: getSearchResults()
    Actions->>Loader: searchWorks(params)

    Note over Loader: クエリ構築<br/>- フルテキスト検索 (to_tsvector)<br/>- カテゴリフィルター<br/>- 並び順適用

    Loader->>DB: SELECT * FROM works<br/>WHERE to_tsvector('japanese', title || ' ' || description)<br/>@@ plainto_tsquery('japanese', keyword)

    DB-->>Loader: { works[], authors[], total_works, total_authors }
    Loader-->>Actions: SearchResponse
    Actions-->>Results: results
    Results-->>Page: JSX (作品カード + ユーザーカード)
    Page-->>User: 検索結果表示
```

**検索処理:**
1. **フルテキスト検索**: PostgreSQLの`to_tsvector`で日本語対応
2. **カテゴリフィルター**: 小説/エッセイ/詩で絞り込み
3. **並び順**: 関連度（`ts_rank`）、閲覧数、いいね数、作成日時
4. **ページネーション**: 12件/ページ
5. **作者検索**: 同時にユーザー名検索も実行

---

### 5.5 UI部品（Leaf）

```mermaid
graph TD
    %% === Leaf Components ===
    subgraph EMPTY["leaf/EmptyResults.tsx"]
        EMPTY_F["EmptyResults()"]
    end

    subgraph PAGINATION["leaf/ResultsPagination.tsx"]
        PAGINATION_F["ResultsPagination()"]
    end

    subgraph RELATED["leaf/RelatedSearches.tsx"]
        RELATED_F["RelatedSearches()"]
    end

    subgraph SEARCH_INPUT["leaf/SearchInput.tsx"]
        SEARCH_INPUT_F["SearchInput()"]
    end

    subgraph FILTER_CHIPS["leaf/FilterChips.tsx"]
        FILTER_CHIPS_F["FilterChips()"]
    end

    subgraph SEARCH_TABS["leaf/SearchTabs.tsx"]
        SEARCH_TABS_F["SearchTabs()"]
    end

    %% === Next.js ===
    subgraph NEXT_LINK["next/link"]
        LINK["Link"]
    end

    %% === 依存関係 ===
    PAGINATION_F --> LINK
    RELATED_F --> LINK
    SEARCH_TABS_F --> LINK

    %% === スタイル ===
    classDef leaf fill:#27272a,stroke:#fde047,stroke-width:2px,color:#fff
    classDef npm fill:#450a0a,stroke:#ef4444,stroke-width:2px,color:#fff

    class EMPTY_F,PAGINATION_F,RELATED_F,SEARCH_INPUT_F,FILTER_CHIPS_F,SEARCH_TABS_F leaf
    class LINK npm
```

**主要Leaf:**
- **EmptyResults**: 検索結果0件時の表示
- **ResultsPagination**: ページネーションUI
- **RelatedSearches**: タグベースの関連検索提案
- **SearchInput**: 検索入力フィールド
- **FilterChips**: カテゴリ・並び順のチップUI
- **SearchTabs**: 全て/作品/ユーザーのタブ切り替え

---

## 6. ユーザープロフィールページ

**ファイルパス:** `app/app/profile/[id]/page.tsx`

### 6.1 全体構造（関数レベル）

```mermaid
graph TD
    %% === ページファイル ===
    subgraph PROFILE_PAGE["📄 app/app/profile/[id]/page.tsx"]
        USER_PROFILE_PAGE["UserProfilePage()"]
        GEN_META_P["generateMetadata()"]
    end

    %% === 認証ファイル ===
    subgraph AUTH_FILE["🔐 lib/auth.ts"]
        GET_AUTH_U["getAuthenticatedUser()"]
    end

    %% === Users Index (Public API) ===
    subgraph USERS_INDEX["📦 features/users/index.ts"]
        GET_USER_PROF["getUserProfile()"]
        CAN_VIEW_PROF["canViewProfile()"]
    end

    %% === Suspense Components ===
    subgraph FAST_PROF["⚙️ features/users/components/FastProfileSuspense.tsx"]
        FAST_PROF_FUNC["FastProfileSuspense()"]
    end

    subgraph USER_STATS["⚙️ features/users/components/UserStatsSuspense.tsx"]
        USER_STATS_FUNC["UserStatsSuspense()"]
    end

    subgraph USER_WORKS["⚙️ features/users/components/UserWorksSuspense.tsx"]
        USER_WORKS_FUNC["UserWorksSuspense()"]
    end

    subgraph FOLLOW_STATUS["⚙️ features/users/components/FollowStatusSuspense.tsx"]
        FOLLOW_STATUS_FUNC["FollowStatusSuspense()"]
    end

    %% === Users Server Loader ===
    subgraph USERS_LOADER["🔄 features/users/server/loader.ts"]
        GET_U_STATS["getUserStats()"]
        GET_U_WORKS["getUserWorks()"]
        GET_FOLLOW_REL["getFollowRelation()"]
        GET_U_PROFILE["getUserProfile() (internal)"]
    end

    %% === Shared Components ===
    subgraph SPINNER_FILE["🎨 components/shared/LoadingSpinner.tsx"]
        SPINNER_P["LoadingSpinner()"]
    end

    %% === Supabase Server ===
    subgraph SB_SERVER_P["🔧 lib/supabase/server.ts"]
        CREATE_CLIENT_P["createClient()"]
    end

    %% === Supabase Pool ===
    subgraph SB_POOL_P["💾 lib/supabase/pool.ts"]
        GET_SHARED_P["getSharedClient()"]
    end

    %% === React ===
    subgraph REACT_P["📦 react"]
        SUSPENSE_P["Suspense"]
        CACHE_P["cache()"]
    end

    %% === 依存関係（Page → Components） ===
    USER_PROFILE_PAGE --> GET_AUTH_U
    USER_PROFILE_PAGE --> GET_USER_PROF
    USER_PROFILE_PAGE --> CAN_VIEW_PROF
    USER_PROFILE_PAGE --> FAST_PROF_FUNC
    USER_PROFILE_PAGE --> USER_STATS_FUNC
    USER_PROFILE_PAGE --> USER_WORKS_FUNC
    USER_PROFILE_PAGE --> FOLLOW_STATUS_FUNC
    USER_PROFILE_PAGE --> SPINNER_P
    USER_PROFILE_PAGE --> SUSPENSE_P

    GEN_META_P --> GET_USER_PROF

    %% === Index → Loader ===
    GET_USER_PROF --> GET_U_PROFILE
    CAN_VIEW_PROF --> GET_U_PROFILE

    %% === Components → Loader ===
    USER_STATS_FUNC --> GET_U_STATS
    USER_WORKS_FUNC --> GET_U_WORKS
    FOLLOW_STATUS_FUNC --> GET_FOLLOW_REL

    %% === 認証 → Supabase ===
    GET_AUTH_U --> CREATE_CLIENT_P

    %% === Loader → Supabase ===
    GET_U_PROFILE --> CREATE_CLIENT_P
    GET_U_STATS --> CREATE_CLIENT_P
    GET_U_WORKS --> CREATE_CLIENT_P
    GET_FOLLOW_REL --> CREATE_CLIENT_P

    %% === Supabase Client Chain ===
    CREATE_CLIENT_P --> GET_SHARED_P
    GET_SHARED_P --> CACHE_P

    %% === スタイル ===
    classDef page fill:#1e293b,stroke:#0ea5e9,stroke-width:3px,color:#fff
    classDef auth fill:#0f172a,stroke:#10b981,stroke-width:2px,color:#fff
    classDef index fill:#1c1917,stroke:#a855f7,stroke-width:2px,color:#fff
    classDef component fill:#18181b,stroke:#f59e0b,stroke-width:2px,color:#fff
    classDef loader fill:#422006,stroke:#fbbf24,stroke-width:2px,color:#fff
    classDef sbServer fill:#171717,stroke:#22d3ee,stroke-width:2px,color:#fff
    classDef sbPool fill:#0c0a09,stroke:#84cc16,stroke-width:2px,color:#fff
    classDef npm fill:#450a0a,stroke:#ef4444,stroke-width:2px,color:#fff

    class USER_PROFILE_PAGE,GEN_META_P page
    class GET_AUTH_U auth
    class GET_USER_PROF,CAN_VIEW_PROF index
    class FAST_PROF_FUNC,USER_STATS_FUNC,USER_WORKS_FUNC,FOLLOW_STATUS_FUNC,SPINNER_P component
    class GET_U_STATS,GET_U_WORKS,GET_FOLLOW_REL,GET_U_PROFILE loader
    class CREATE_CLIENT_P sbServer
    class GET_SHARED_P sbPool
    class SUSPENSE_P,CACHE_P npm
```

### 6.2 認証・権限確認フロー

```mermaid
sequenceDiagram
    participant Page as 📄 UserProfilePage
    participant Auth as 🔐 getAuthenticatedUser
    participant Check as 🔍 canViewProfile
    participant Profile as 👤 getUserProfile

    Page->>Auth: 現在のユーザー取得
    Auth-->>Page: currentUser or null

    Page->>Profile: プロフィール取得(userId)
    Profile-->>Page: profileData

    Page->>Check: 閲覧権限確認(currentUser, profileData)

    alt プロフィールが公開 or 自分自身
        Check-->>Page: true
        Page->>Page: プロフィール表示
    else プロフィールが非公開 and 他人
        Check-->>Page: false
        Page->>Page: 非公開メッセージ表示
    end
```

---

## 7. 投稿ページ

**ファイルパス:** `app/app/post/page.tsx`

### 7.1 全体構造

```mermaid
graph TD
    %% === ページレイヤー ===
    subgraph "app/app/post/page.tsx"
        POST_PAGE["WorkCreatePage()"]
    end

    %% === 認証 ===
    subgraph "lib/auth.ts"
        GET_POST_USER["getPostUserProfile()"]
    end

    %% === データローダー ===
    subgraph "features/post/server/"
        LOADER["loader.ts<br/>getPostCreationData()"]
    end

    %% === Sections (大画面ブロック) ===
    subgraph "features/post/sections/"
        BASIC["WorkCreateBasicSection"]
        MEDIA["WorkCreateMediaSection"]
        CONTENT["WorkCreateContentSection"]
        SETTINGS["WorkCreateSettingsSection"]
        PREVIEW["WorkCreatePreviewSection"]
        DRAFT["WorkCreateDraftSection"]
    end

    %% === Supabase ===
    subgraph "lib/supabase/"
        SB["createClient()"]
    end

    %% === 依存関係 ===
    POST_PAGE --> GET_POST_USER
    POST_PAGE --> LOADER
    POST_PAGE --> BASIC
    POST_PAGE --> MEDIA
    POST_PAGE --> CONTENT
    POST_PAGE --> SETTINGS
    POST_PAGE --> PREVIEW
    POST_PAGE --> DRAFT

    GET_POST_USER --> SB
    LOADER --> SB

    %% === スタイル ===
    classDef page fill:#1e293b,stroke:#0ea5e9,stroke-width:3px,color:#fff
    classDef auth fill:#0f172a,stroke:#10b981,stroke-width:2px,color:#fff
    classDef loader fill:#0c0a09,stroke:#84cc16,stroke-width:2px,color:#fff
    classDef section fill:#1c1917,stroke:#a855f7,stroke-width:2px,color:#fff
    classDef lib fill:#171717,stroke:#22d3ee,stroke-width:2px,color:#fff

    class POST_PAGE page
    class GET_POST_USER auth
    class LOADER loader
    class BASIC,MEDIA,CONTENT,SETTINGS,PREVIEW,DRAFT section
    class SB lib
```

### 7.2 UI部品（Leaf）依存関係

```mermaid
graph TD
    %% === Sections ===
    subgraph Sections["sections/"]
        BASIC_SEC["WorkCreateBasicSection"]
        MEDIA_SEC["WorkCreateMediaSection"]
        CONTENT_SEC["WorkCreateContentSection"]
        SETTINGS_SEC["WorkCreateSettingsSection"]
    end

    %% === Leaf Components ===
    subgraph Leaf["leaf/"]
        CAT_SELECT["CategorySelect"]
        TAG_INPUT["TagInput"]
        SERIES_SELECT["SeriesSelector"]
        IMAGE_UPLOAD["ImageUpload"]
        IMAGE_CROP["ImageCropper"]
        RICH_EDITOR["RichTextEditor"]
        PROOF["ProofreadingPanel"]
        PUBLISH_OPT["PublishingOptions"]
        CONTEXT_MENU["ContextMenu"]
    end

    %% === 依存関係 ===
    BASIC_SEC --> CAT_SELECT
    BASIC_SEC --> TAG_INPUT
    BASIC_SEC --> SERIES_SELECT

    MEDIA_SEC --> IMAGE_UPLOAD
    MEDIA_SEC --> IMAGE_CROP

    CONTENT_SEC --> RICH_EDITOR
    CONTENT_SEC --> PROOF
    CONTENT_SEC --> CONTEXT_MENU

    SETTINGS_SEC --> PUBLISH_OPT

    %% === スタイル ===
    classDef section fill:#1c1917,stroke:#a855f7,stroke-width:2px,color:#fff
    classDef leaf fill:#18181b,stroke:#f59e0b,stroke-width:2px,color:#fff

    class BASIC_SEC,MEDIA_SEC,CONTENT_SEC,SETTINGS_SEC section
    class CAT_SELECT,TAG_INPUT,SERIES_SELECT,IMAGE_UPLOAD,IMAGE_CROP,RICH_EDITOR,PROOF,PUBLISH_OPT,CONTEXT_MENU leaf
```

### 7.3 データフロー

```mermaid
sequenceDiagram
    participant User as 👤 ユーザー
    participant Page as 📄 WorkCreatePage
    participant Auth as 🔐 getPostUserProfile
    participant Loader as 🔄 getPostCreationData
    participant DB as 🗄️ Database

    User->>Page: 投稿ページアクセス
    Page->>Auth: プロフィール取得
    Auth->>DB: auth.getUser()
    DB-->>Auth: User + Profile
    Auth-->>Page: user

    Page->>Loader: データ取得(userId, username)

    Note over Loader: Promise.all()で並列取得

    par シリーズ取得
        Loader->>DB: SELECT * FROM series<br/>WHERE user_id = xxx
        DB-->>Loader: series[]
    and 下書き取得
        Loader->>DB: SELECT * FROM works<br/>WHERE user_id = xxx<br/>AND status = 'draft'
        DB-->>Loader: drafts[]
    end

    Loader-->>Page: { series, drafts }
    Page-->>User: フォーム表示
```

**主要データ取得:**
- **シリーズ一覧**: ユーザーが作成した既存シリーズ
- **下書き一覧**: 未公開の作品

---

## 8. トレンドページ

**ファイルパス:** `app/app/trends/page.tsx`

### 8.1 全体構造

```mermaid
graph TD
    %% === ページレイヤー ===
    subgraph "app/app/trends/page.tsx"
        TRENDS_PAGE["TrendsPage()"]
    end

    %% === Sections ===
    subgraph "features/trends/sections/"
        MAIN["TrendPageSection"]
        HERO["TrendHeroSection"]
        TAGS["TrendTagsSection"]
        TRENDING["TrendingWorksSection"]
        WORKS_RANK["WorksRankingSection"]
        USERS_RANK["UsersRankingSection"]
    end

    %% === Shared Components ===
    subgraph "components/shared/"
        SPINNER["LoadingSpinner"]
    end

    %% === React ===
    subgraph "react"
        SUSPENSE["Suspense"]
    end

    %% === 依存関係 ===
    TRENDS_PAGE --> SUSPENSE
    TRENDS_PAGE --> SPINNER
    TRENDS_PAGE --> MAIN

    MAIN --> HERO
    MAIN --> TAGS
    MAIN --> TRENDING
    MAIN --> WORKS_RANK
    MAIN --> USERS_RANK

    %% === スタイル ===
    classDef page fill:#1e293b,stroke:#0ea5e9,stroke-width:3px,color:#fff
    classDef section fill:#1c1917,stroke:#a855f7,stroke-width:2px,color:#fff
    classDef comp fill:#18181b,stroke:#f59e0b,stroke-width:2px,color:#fff
    classDef npm fill:#450a0a,stroke:#ef4444,stroke-width:2px,color:#fff

    class TRENDS_PAGE page
    class MAIN,HERO,TAGS,TRENDING,WORKS_RANK,USERS_RANK section
    class SPINNER comp
    class SUSPENSE npm
```

### 8.2 データローダー構造

```mermaid
graph TD
    subgraph "features/trends/server/"
        LOADER["loader.ts"]
        WORK_Q["workQueries.ts"]
        USER_Q["userQueries.ts"]
        TREND_Q["trendQueries.ts"]
    end

    subgraph "Functions"
        GET_TREND_WORKS["getTrendingWorks()"]
        GET_WORKS_RANK["getWorksRanking()"]
        GET_USERS_RANK["getUsersRanking()"]
        GET_TREND_TAGS["getTrendTags()"]
        GET_HERO["getHeroBanners()"]
        GET_ANNOUNCE["getAnnouncements()"]
    end

    subgraph "lib/supabase/"
        CLIENT["createClient()"]
    end

    %% === 依存関係 ===
    LOADER --> WORK_Q
    LOADER --> USER_Q
    LOADER --> TREND_Q

    WORK_Q --> GET_TREND_WORKS
    WORK_Q --> GET_WORKS_RANK
    USER_Q --> GET_USERS_RANK
    TREND_Q --> GET_TREND_TAGS
    TREND_Q --> GET_HERO
    TREND_Q --> GET_ANNOUNCE

    GET_TREND_WORKS --> CLIENT
    GET_WORKS_RANK --> CLIENT
    GET_USERS_RANK --> CLIENT
    GET_TREND_TAGS --> CLIENT
    GET_HERO --> CLIENT
    GET_ANNOUNCE --> CLIENT

    %% === スタイル ===
    classDef loader fill:#0c0a09,stroke:#84cc16,stroke-width:2px,color:#fff
    classDef func fill:#422006,stroke:#fbbf24,stroke-width:2px,color:#fff
    classDef lib fill:#171717,stroke:#22d3ee,stroke-width:2px,color:#fff

    class LOADER,WORK_Q,USER_Q,TREND_Q loader
    class GET_TREND_WORKS,GET_WORKS_RANK,GET_USERS_RANK,GET_TREND_TAGS,GET_HERO,GET_ANNOUNCE func
    class CLIENT lib
```

### 8.3 UI部品（Leaf）

```mermaid
graph TD
    subgraph Sections["sections/"]
        MAIN_SEC["TrendPageSection"]
        TAGS_SEC["TrendTagsSection"]
    end

    subgraph Leaf["leaf/"]
        TABS["TrendTabs"]
        BANNER["HeroBanner"]
        TAG_CHIP["TrendTagChip"]
    end

    %% === 依存関係 ===
    MAIN_SEC --> TABS
    MAIN_SEC --> BANNER
    TAGS_SEC --> TAG_CHIP

    %% === スタイル ===
    classDef section fill:#1c1917,stroke:#a855f7,stroke-width:2px,color:#fff
    classDef leaf fill:#18181b,stroke:#f59e0b,stroke-width:2px,color:#fff

    class MAIN_SEC,TAGS_SEC section
    class TABS,BANNER,TAG_CHIP leaf
```

**特徴:**
- **静的生成**: ISR（Incremental Static Regeneration）使用、5分ごとに再生成
- **認証不要**: 公開ページ

---

## 9. 認証ページ

### 9.1 ログイン・サインアップページ

**ファイルパス:** `app/auth/login/page.tsx`, `app/auth/signup/page.tsx`

```mermaid
graph TD
    %% === ログインページ ===
    subgraph "app/auth/login/page.tsx"
        LOGIN_PAGE["LoginPage()"]
    end

    %% === サインアップページ ===
    subgraph "app/auth/signup/page.tsx"
        SIGNUP_PAGE["SignupPage()"]
    end

    %% === Sections ===
    subgraph "features/auth/sections/"
        LOGIN_FORM["LoginFormSection"]
        SIGNUP_FORM["SignupFormSection"]
        FORGOT_FORM["ForgotPasswordForm"]
        RESET_FORM["ResetPasswordForm"]
    end

    %% === 依存関係 ===
    LOGIN_PAGE --> LOGIN_FORM
    SIGNUP_PAGE --> SIGNUP_FORM

    %% === スタイル ===
    classDef page fill:#1e293b,stroke:#0ea5e9,stroke-width:3px,color:#fff
    classDef section fill:#1c1917,stroke:#a855f7,stroke-width:2px,color:#fff

    class LOGIN_PAGE,SIGNUP_PAGE page
    class LOGIN_FORM,SIGNUP_FORM,FORGOT_FORM,RESET_FORM section
```

### 9.2 UI部品（Leaf）依存関係

```mermaid
graph TD
    %% === Sections ===
    subgraph Sections["sections/"]
        LOGIN_SEC["LoginFormSection"]
        SIGNUP_SEC["SignupFormSection"]
    end

    %% === Leaf Components ===
    subgraph Leaf["leaf/"]
        FORM_FIELD["FormField"]
        PASSWORD_INPUT["PasswordInput"]
        SOCIAL_BTN["SocialLoginButton"]
    end

    %% === 依存関係 ===
    LOGIN_SEC --> FORM_FIELD
    LOGIN_SEC --> PASSWORD_INPUT
    LOGIN_SEC --> SOCIAL_BTN

    SIGNUP_SEC --> FORM_FIELD
    SIGNUP_SEC --> PASSWORD_INPUT
    SIGNUP_SEC --> SOCIAL_BTN

    %% === スタイル ===
    classDef section fill:#1c1917,stroke:#a855f7,stroke-width:2px,color:#fff
    classDef leaf fill:#18181b,stroke:#f59e0b,stroke-width:2px,color:#fff

    class LOGIN_SEC,SIGNUP_SEC section
    class FORM_FIELD,PASSWORD_INPUT,SOCIAL_BTN leaf
```

### 9.3 認証フロー（Server Actions）

```mermaid
sequenceDiagram
    participant User as 👤 ユーザー
    participant Form as 📝 LoginFormSection
    participant Action as ⚡ loginAction
    participant Schema as 📋 loginSchema (Zod)
    participant Supabase as ☁️ Supabase Auth
    participant DB as 🗄️ Database

    User->>Form: メール・パスワード入力
    User->>Form: フォーム送信
    Form->>Action: loginAction(formData)

    Action->>Schema: safeParse(rawFormData)

    alt バリデーション成功
        Schema-->>Action: { success: true, data }
        Action->>Supabase: auth.signInWithPassword()

        alt ログイン成功
            Supabase->>DB: ユーザー情報取得
            DB-->>Supabase: user data
            Supabase-->>Action: { user, session }
            Action-->>Form: redirect('/')
            Form-->>User: ホームページへ
        else ログイン失敗
            Supabase-->>Action: { error }
            Action-->>Form: { errors }
            Form-->>User: エラーメッセージ表示
        end
    else バリデーション失敗
        Schema-->>Action: { success: false, error }
        Action-->>Form: { errors }
        Form-->>User: エラーメッセージ表示
    end
```

**主要Server Actions:**
- `loginAction()`: ログイン処理
- `signupAction()`: サインアップ処理
- `forgotPasswordAction()`: パスワードリセットメール送信

**バリデーション（Zod Schemas）:**
- `loginSchema`: メール・パスワード検証
- `signupSchema`: ユーザー名・メール・パスワード・生年月日・利用規約同意検証
- `forgotPasswordSchema`: メールアドレス検証

---

## 10. Feature内部構造

### 10.1 works機能

**ディレクトリ:** `features/works/`

```mermaid
graph TD
    %% === Public API ===
    subgraph Public["features/works/index.ts"]
        INDEX["export"]
    end

    %% === Server Layer ===
    subgraph Server["server/"]
        LOADER["loader.ts"]
        ACTIONS["actions.ts"]
        READING["reading.ts"]
        CREATION["creation.ts"]
    end

    %% === Sections (大画面ブロック) ===
    subgraph Sections["sections/"]
        BASIC["WorkBasicInfo"]
        CONTENT["WorkContentWithProgress"]
        ACTIONS_UI["WorkUserActions"]
        COMMENTS["WorkDetailCommentsSection"]
    end

    %% === Leaf (小UI部品) ===
    subgraph Leaf["leaf/"]
        BOOKMARK_BTN["BookmarkFloatingButton"]
        LIKE_BTN["LikeButton"]
        SHARE_BTN["ShareButton"]
    end

    %% === Schema & Types ===
    subgraph Schema["schemas.ts & types.ts"]
        SCHEMAS["Zod Schemas"]
        TYPES["TypeScript Types"]
    end

    %% === 依存関係 ===
    INDEX --> LOADER
    INDEX --> ACTIONS
    INDEX --> BASIC
    INDEX --> CONTENT
    INDEX --> SCHEMAS
    INDEX --> TYPES

    BASIC --> TYPES
    CONTENT --> READING
    CONTENT --> TYPES

    ACTIONS_UI --> ACTIONS
    ACTIONS_UI --> LIKE_BTN
    ACTIONS_UI --> BOOKMARK_BTN
    ACTIONS_UI --> SHARE_BTN

    COMMENTS --> ACTIONS

    LOADER --> TYPES
    ACTIONS --> SCHEMAS
    READING --> TYPES

    %% === スタイル ===
    classDef publicStyle fill:#1e293b,stroke:#0ea5e9,stroke-width:3px,color:#fff
    classDef serverStyle fill:#0c0a09,stroke:#84cc16,stroke-width:2px,color:#fff
    classDef sectionStyle fill:#1c1917,stroke:#a855f7,stroke-width:2px,color:#fff
    classDef leafStyle fill:#18181b,stroke:#f59e0b,stroke-width:2px,color:#fff
    classDef schemaStyle fill:#171717,stroke:#22d3ee,stroke-width:2px,color:#fff

    class INDEX publicStyle
    class LOADER,ACTIONS,READING,CREATION serverStyle
    class BASIC,CONTENT,ACTIONS_UI,COMMENTS sectionStyle
    class BOOKMARK_BTN,LIKE_BTN,SHARE_BTN leafStyle
    class SCHEMAS,TYPES schemaStyle
```

**構造ルール:**
- **server/**: データ取得・操作ロジック
- **sections/**: 大きな画面ブロック（200行以内）
- **leaf/**: 小さなUI部品（150行以内）
- **schemas.ts**: Zodバリデーション
- **types.ts**: TypeScript型定義
- **index.ts**: 外部公開API

---

## 図の見方

### 色分け

| 色 | レイヤー | 説明 | 例 |
|---|---|---|---|
| **🔵 青** | Page | Next.js App Routerページ | `HomePage()` |
| **🟢 緑** | Auth | 認証レイヤー | `getAuthenticatedUser()` |
| **🟠 オレンジ** | Component | 共通UI部品 | `LoadingSpinner` |
| **🟣 紫** | Feature | ドメイン機能コンポーネント | `ContinueReadingSuspense` |
| **🔷 シアン** | Lib | Supabaseクライアント（server.ts） | `createClient()` |
| **🟩 ライム** | Server | サーバープール（pool.ts） | `getSharedClient()` |
| **🟡 黄** | Util | ユーティリティ関数 | `cn()`, `formatDistanceToNow()` |
| **🔴 赤** | NPM | 外部npmパッケージ | `@supabase/ssr`, `clsx`, `twMerge` |
| **💙 明青** | Next.js | Next.js公式API | `next/headers` |

### 階層ルール

1. **Page** (200-300行): ルーティング・認証確認
2. **Section** (200行以内): 大きな画面ブロック
3. **Leaf** (150行以内): 小さなUI部品

### 命名規則

- 機能接頭辞: `Work*`, `User*`, `Search*`
- Section: `*Section`
- Leaf: `*Button`, `*Card`, `*Badge`等

---

## 開発時の注意点

1. **依存の向き**: 上位レイヤー → 下位レイヤーのみ
2. **再利用**: 3回以上で共通化検討
3. **分割基準**: 250行超えたら分割
4. **キャッシュ**: `lib/cache.ts`のタグ関数で統一
5. **スタイル**: 8割TailwindCSS直書き、2割CSS化
