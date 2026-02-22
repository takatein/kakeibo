import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.BEDROCK_REGION || 'ap-northeast-1',
});

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const KNOWLEDGE_TABLE = process.env.KNOWLEDGE_TABLE;

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

/** 設計書 §8-3 カテゴリ定義 */
const CATEGORIES = [
  'food_home', 'food_restaurant', 'food_premium',
  'daily_goods', 'children', 'education',
  'outing', 'travel', 'medical',
  'utility', 'insurance', 'loan',
  'car', 'hobby', 'other',
];

const CATEGORY_LABELS = {
  food_home: '食費（自炊）',
  food_restaurant: '外食',
  food_premium: '外食（高級）',
  daily_goods: '日用品',
  children: '子供関連',
  education: '教育費',
  outing: '週末外出',
  travel: '旅行',
  medical: '医療費',
  utility: '光熱費・通信',
  insurance: '保険',
  loan: 'ローン',
  car: '車関連',
  hobby: '趣味',
  other: 'その他',
};

/**
 * 設計書 §8-3 Categorizer Agent プロンプト
 * 過去のパターンと文脈ナレッジを使ってカテゴリ分類
 */
function buildCategorizerPrompt(contextKnowledge) {
  const shopRules = contextKnowledge?.shopToCategory
    ? Object.entries(contextKnowledge.shopToCategory)
        .map(([shop, cat]) => `  - ${shop} → ${cat}`)
        .join('\n')
    : '  (未学習)';

  return `あなたは家計簿アプリ「Kakeibo AI」のカテゴライザーです。
ユーザーの入力テキストから支出情報を抽出し、以下のカテゴリに分類してください。

## カテゴリ一覧
${CATEGORIES.map(c => `- ${c}: ${CATEGORY_LABELS[c]}`).join('\n')}

## 分類ルール（設計書 §8-3 準拠）
1. 金額3,000円以上の外食 → food_premium（高級）
2. スーパー・生鮮食品 → food_home
3. ファミレス・ファストフード → food_restaurant
4. 子供用品・おもちゃ → children
5. 塾・習い事 → education
6. 公園・動物園・映画 → outing
7. ドラッグストア → daily_goods（子供用品が明示的でなければ）

## 学習済みパターン
${shopRules}

## 出力フォーマット
以下のJSON配列を返してください（複数アイテム可）:
[{
  "shopName": "店名（推定できる場合）",
  "amount": 数値,
  "category": "カテゴリコード",
  "confidence": 0.0〜1.0,
  "date": "YYYY-MM-DD",
  "memo": "入力テキストそのまま",
  "alternativeCategories": ["代替カテゴリ1", "代替カテゴリ2"]
}]

必ず有効なJSON配列のみを返してください。`;
}

/** familyIdからナレッジを取得 */
async function getContextKnowledge(pk) {
  if (!KNOWLEDGE_TABLE) return null;
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: KNOWLEDGE_TABLE,
      KeyConditionExpression: 'PK = :pk AND SK = :sk',
      ExpressionAttributeValues: {
        ':pk': pk,
        ':sk': 'context#rules',
      },
    }));
    return result.Items?.[0] || null;
  } catch {
    return null;
  }
}

export async function handler(event) {
  try {
    const body = JSON.parse(event.body);
    const input = body.content || body.input;
    const inputType = body.type || 'text';

    if (!input) {
      return response(400, { error: 'content is required', code: 'E2001' });
    }

    const familyId = event.requestContext?.authorizer?.claims?.['custom:familyId'] || 'demo-family';
    const pk = `family_${familyId}`;
    const inputBy = event.requestContext?.authorizer?.claims?.['custom:role'] || 'primary';

    // ナレッジ取得
    const contextKnowledge = await getContextKnowledge(pk);

    const today = new Date().toISOString().split('T')[0];
    const systemPrompt = buildCategorizerPrompt(contextKnowledge);

    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `今日は${today}です。入力方式: ${inputType}\n\n「${input}」`,
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

    // JSON配列を抽出
    const jsonMatch = assistantText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      // 単一オブジェクトの場合も試行
      const singleMatch = assistantText.match(/\{[\s\S]*\}/);
      if (!singleMatch) {
        return response(500, { error: 'Failed to parse AI response', code: 'E1001' });
      }
      const parsed = JSON.parse(singleMatch[0]);
      return buildConfirmResponse([parsed], today, pk, inputBy);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return buildConfirmResponse(Array.isArray(parsed) ? parsed : [parsed], today, pk, inputBy);
  } catch (err) {
    console.error('AI Categorize Error:', err);
    return response(500, { error: 'Failed to categorize', code: 'E1001' });
  }
}

function buildConfirmResponse(items, today, pk, inputBy) {
  const sessionId = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  const confirmItems = items.map((item, index) => ({
    tempId: `temp-${index}-${Date.now()}`,
    amount: Number(item.amount) || 0,
    category: CATEGORIES.includes(item.category) ? item.category : 'other',
    categoryLabel: CATEGORY_LABELS[item.category] || 'その他',
    shopName: item.shopName || null,
    date: item.date || today,
    memo: item.memo || '',
    confidence: Number(item.confidence) || 0.5,
    alternativeCategories: (item.alternativeCategories || [])
      .filter(c => CATEGORIES.includes(c))
      .slice(0, 2)
      .map(c => ({ category: c, label: CATEGORY_LABELS[c] })),
  }));

  return response(200, {
    sessionId,
    items: confirmItems,
    needsClarification: confirmItems.some(i => i.confidence < 0.5),
    clarificationMessage: confirmItems.some(i => i.confidence < 0.5)
      ? 'カテゴリに迷うアイテムがあります。確認してください。'
      : undefined,
  });
}
