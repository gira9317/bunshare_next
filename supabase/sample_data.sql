-- サンプル作品データを作成（テスト用）
INSERT INTO public.works (
  work_id,
  user_id,
  title,
  category,
  description,
  content,
  tags,
  is_published,
  allow_comments,
  is_adult_content,
  views,
  likes,
  comments,
  created_at,
  updated_at
) VALUES 
-- サンプル作品1
(
  gen_random_uuid(),
  'cba33605-1781-4fda-a176-4d368b162750', -- あなたのユーザーID
  '星降る夜の物語',
  '小説',
  '静寂な夜空に降る星たちが奏でる、美しくも切ない物語。',
  '第一章 星降る夜

夜空には無数の星が瞬いていた。まるで天の神々が地上の人々に向けて投げかけた祝福のようだった。

「また星を見てるの？」

背後から聞こえた声に振り返ると、幼なじみの美月が立っていた。彼女の瞳には、僕が見上げている星空と同じ光が宿っているように見えた。

「星って、本当はすごく遠くにあるのに、こんなに近くに感じるよね」

僕はそう呟きながら、再び夜空を見上げた。美月も隣に座り、同じように星を見上げる。

二人の間に流れる時間は、まるで永遠のようだった。',
  ARRAY['ファンタジー', '青春', '恋愛'],
  true,
  true,
  false,
  125,
  23,
  8,
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days'
),

-- サンプル作品2
(
  gen_random_uuid(),
  'cba33605-1781-4fda-a176-4d368b162750',
  '雨のカフェテラス',
  'エッセイ',
  '雨の日に見つけた小さなカフェでの、心温まるひとときの記録。',
  '雨の音がカフェの窓を叩いている。

今日は予定していた散歩を諦めて、偶然見つけたこの小さなカフェに足を向けた。店内は温かく、コーヒーの香りが心地よく漂っている。

窓の外を見ると、雨に濡れた街並みがいつもより美しく見える。水滴が作る小さな川が歩道を流れ、街路樹の葉が雨に洗われて鮮やかな緑色を見せている。

「雨の日も悪くないな」

僕は一人つぶやきながら、温かいコーヒーカップを両手で包んだ。',
  ARRAY['日常', 'カフェ', '雨'],
  true,
  true,
  false,
  89,
  15,
  3,
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
),

-- サンプル作品3
(
  gen_random_uuid(),
  'cba33605-1781-4fda-a176-4d368b162750',
  'デジタルの森',
  'SF',
  'コンピューターの中に広がる、もうひとつの世界の冒険譚。',
  'プロローグ

電子の海を泳ぐ魚たちが、僕の周りを旋回している。ここはデジタルの森—現実世界とは全く異なるルールが支配する電脳空間だ。

僕の名前はケイ。現実世界では普通の高校生だが、この世界では伝説のハッカーと呼ばれている。

「また君か、ケイ」

背後から聞こえた声に振り返ると、この森の守護者であるAIのアリスが立っていた。彼女は人間の少女の姿をしているが、その瞳には無限のデータが流れている。

「今日も何かを探しに来たの？」

「ああ。失われたプログラムを探してる」

僕は答えながら、深い森の奥を見つめた。',
  ARRAY['SF', 'サイバーパンク', '冒険'],
  true,
  true,
  false,
  234,
  45,
  12,
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '5 days'
);

-- ビューカウント増加用の関数（存在しない場合のみ作成）
CREATE OR REPLACE FUNCTION increment_work_views(work_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.works 
  SET views = COALESCE(views, 0) + 1,
      updated_at = NOW()
  WHERE works.work_id = increment_work_views.work_id;
END;
$$ LANGUAGE plpgsql;