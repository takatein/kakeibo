import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.BEDROCK_REGION || 'ap-northeast-1',
});

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
}

const CATEGORIES = [
  'food_cooking', 'food_eating_out', 'food_delivery', 'drinking',
  'daily_necessities', 'transportation', 'entertainment', 'clothing',
  'medical', 'education', 'housing', 'utilities', 'communication',
  'insurance', 'loan', 'childcare', 'beauty', 'subscription', 'other',
];

const SYSTEM_PROMPT = `あなたは家計簿アプリのAIアシスタントです。
ユーザーの入力テキストから以下の情報を抽出してJSON形式で返してください。

- storeName: 店名（推定できる場合）
- amount: 金額（数値のみ、円は不要）
- category: カテゴリ（以下から選択）
  ${CATEGORIES.join(', ')}
- confidence: 確信度（0.0〜1.0）
- date: 日付（YYYY-MM-DD形式。言及がなければ今日）
- memo: メモ（入力テキストをそのまま）

必ず有効なJSON形式のみを返してください。`;

export async function handler(event) {
  try {
    const body = JSON.parse(event.body);
    const input = body.input;

    if (!input) {
      return response(400, { error: 'input is required' });
    }

    const today = new Date().toISOString().split('T')[0];

    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `今日は${today}です。以下のテキストを分類してください:\n\n「${input}」`,
        },
      ],
    };

    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    });

    const result = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(result.body));
    const assistantText = responseBody.content[0].text;

    // JSONを抽出
    const jsonMatch = assistantText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return response(500, { error: 'Failed to parse AI response' });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return response(200, {
      storeName: parsed.storeName || null,
      amount: Number(parsed.amount) || 0,
      category: CATEGORIES.includes(parsed.category) ? parsed.category : 'other',
      confidence: Number(parsed.confidence) || 0.5,
      date: parsed.date || today,
      memo: parsed.memo || input,
    });
  } catch (err) {
    console.error('AI Categorize Error:', err);
    return response(500, { error: 'Failed to categorize' });
  }
}
