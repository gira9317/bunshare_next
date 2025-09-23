This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

<br>

## テスト & 障害対応

- トップページ


<br>

- 固定部分(ヘッダー, フッター, サイドバー)

  - [ ] ヘッダー
    - [ ] 検索ページ
      - [ ] カテゴリ、並び順の適用が妙に遅いような気がする(適用時に毎回DBから引っ張ってる？アルゴリズム改良できるかも)
      - [ ] カテゴリの「日記」「ラノベ」「ノンフィクション」で「検索結果の取得に失敗しました。しばらくしてから再度お試しください。」というエラーがでる(作品がないということではなさそう)
      - [ ] 作者のもっと見るボタンを押したとき、「フォロワー数順」がアクティブになっているが、実際のソートはそうなっていない(他のソートに切り替えて、フォロワー数順にするとちゃんとフォロワー数順になる)
      - [ ] 作者プロフィールへのリンクがおかしい(http://localhost:3000/users/ユーザID ではなく、http://localhost:3000/app/profile/ユーザID である必要がある)
      - [ ] 作者のもっと見るが24人に固定されていて(検索に引っかかったのが24人以上の場合)、もっと見るをクリックすると24人以上検索に引っかかったユーザがいても24人分しか表示されない(aとかで検索するとそうなる)
      - [ ] 初期表示(MAX6人)の作者のソートはどうなってる？フォロワー数順とかで固定してやるのがいいだろう
      - [ ] 作品の次へボタンや2,3...ボタンのリンクにappがない
      - [ ] 検索ボタンを押下すると、検索ワードが消える(ヘッダー部を再読み込みしている影響かと)
    - [ ] 通知ボタン
      - [ ] すべて既読ボタンを押下し、通知を既読状態にした後、検索ページに遷移すると、通知が未読状態になる(おそらく、検索ページだけヘッダー部を再読み込みしていて、かつ既読状態への変更がDBに通知されていない(ページリロードしても未読状態が復活するし))
      - [ ] 作品ページに遷移しない(リンクにappがない、かつ本来worksなのが、workになってしまっているため)

  - [ ] フッター
    - [ ] リンクにappがない(ヘルプについてはappを手動でつけたらページが存在する)(そもそもappをつけたままにするのかってのも考えないといけないけど...統一は必要)
    - [ ] 利用規約ページ、プライバシーポリシー内の各種リンクにもappがない
    - [ ] ヘルプページのよくある質問については精査が必要
    - [ ] ヘルプページの「お問い合わせメールを送る」ボタンではお問い合わせページに遷移させる方がいい
    - [ ] ヘルプページの「利用規約」、「プライバシーポリシー」のリンクにもappがない

<br>

- ホーム


<br>

- トレンド


<br>

- 投稿


<br>

- プロフィール


<br>

- 全体
  - [ ] 作品カード
    - [ ] 画像取得できなかった場合の表示は何かあった方がいいかも





















