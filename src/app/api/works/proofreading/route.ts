import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

interface ProofreadingRequest {
  text: string
  prompt: string
}

interface ProofreadingResponse {
  revisedText: string
  explanation?: string
}

export async function POST(request: NextRequest) {
  try {
    const { text, prompt }: ProofreadingRequest = await request.json()

    // バリデーション
    if (!text || !prompt) {
      return NextResponse.json(
        { error: 'テキストとプロンプトは必須です' },
        { status: 400 }
      )
    }

    if (text.length > 10000) {
      return NextResponse.json(
        { error: 'テキストは10,000文字以内にしてください' },
        { status: 400 }
      )
    }

    // OpenAI SDKを初期化
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI APIキーが設定されていません' },
        { status: 500 }
      )
    }

    const openai = new OpenAI({ apiKey: openaiApiKey })

    // 新しいGPT-5 APIを使用
    const result = await openai.responses.create({
      model: "gpt-5-nano-2025-08-07",
      input: `
あなたは日本語の文章校正アシスタントです。
以下の条件に従って、ユーザーの文章を校正してください。

# 出力形式
必ず次の JSON 形式で返してください。
{
  "revisedText": "修正されたテキスト",
  "explanation": "修正理由（簡潔に）"
}

# 校正ルール
- 自然で読みやすい日本語にする
- 文法や表現の誤りを訂正する
- ユーザーから与えられた指示に従う
- 元の意味や文体はできる限り保持する
- JSON以外の文字列は返さない

# ユーザーの要求
${prompt}

# 修正対象テキスト
${text}
  `,
      reasoning: { effort: "low" },
      text: { verbosity: "low" }
    })

    const aiResponse = result.output_text

    if (!aiResponse) {
      return NextResponse.json(
        { error: 'AI応答を取得できませんでした' },
        { status: 500 }
      )
    }

    try {
      // JSON形式の応答をパース
      const parsedResponse = JSON.parse(aiResponse) as ProofreadingResponse
      
      // 応答の検証
      if (!parsedResponse.revisedText) {
        throw new Error('修正テキストが含まれていません')
      }

      return NextResponse.json({
        revisedText: parsedResponse.revisedText,
        explanation: parsedResponse.explanation || '校正が完了しました'
      })

    } catch (parseError) {
      // JSON解析に失敗した場合、テキスト全体を修正結果として返す
      console.warn('AI応答のJSON解析に失敗:', parseError)
      
      return NextResponse.json({
        revisedText: aiResponse,
        explanation: '校正が完了しました'
      })
    }

  } catch (error) {
    console.error('校正API エラー:', error)
    return NextResponse.json(
      { error: '校正処理中にエラーが発生しました' },
      { status: 500 }
    )
  }
}