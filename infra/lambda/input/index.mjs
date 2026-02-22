/**
 * Input Handler（設計書 §9-1）
 * POST /input → AI分類 → ConfirmItem[] を返す
 * POST /input/confirm → 確定保存
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.BEDROCK_REGION || 'ap-northeast-1',
});

const TABLE_NAME = process.env.MAIN_TABLE;

const CATEGORIES = [
  'food_home', 'food_restaurant', 'food_premium',
  'daily_goods', 'children', 'education',
  'outing', 'travel', 'medical',
  'utility', 'insurance', 'loan',
  'car', 'hobby', 'other',
];

const CATEGORY_LABELS = {
  food_home: '食費（自炊）', food_restaurant: '外食', food_premium: '外食（高級）',
  daily_goods: '日用品', children: '子供関連', education: '教育費',
  outing: '週末外出', travel: '旅行', medical: '医療費',
  utility: '光熱費・通信', insurance: '保険', loan: 'ローン',
  car: '車関連', hobby: '趣味', other: 'その他',
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  };
}

function getFamilyPK(event) {
  const familyId = event.requestContext?.authorizer?.claims?.['custom:familyId'] || 'demo-family';
  return `family_${familyId}`;
}

function getInputBy(event) {
  return event.requestContext?.authorizer?.claims?.['custom:role'] || 'primary';
}

function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
}

export async function handler(event) {
  const pk = getFamilyPK(event);
  const resource = event.resource || event.path || '';

  try {
    if (resource.endsWith('/confirm')) {
      return await handleConfirm(pk, getInputBy(event), JSON.parse(event.body));
    } else {
      return await handleInput(pk, JSON.parse(event.body));
    }
  } catch (err) {
    console.error('Input Handler Error:', err);
    return response(500, { error: 'Internal server error', code: 'E5001' });
  }
}

/**
 * POST /input（設計書 §9-1）
 * テキスト/音声入力をAI分類 → ConfirmItem[] を返す
 */
async function handleInput(pk, body) {
  const { type, content } = body;
  if (!content) return response(400, { error: 'content is required', code: 'E2001' });

  const today = new Date().toISOString().split('T')[0];

  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 1000,
    system: buildPrompt(),
    messages: [{ role: 'user', content: `今日は${today}です。入力方式: ${type || 'text'}\n\n「${content}」` }],
  };

  const result = await bedrockClient.send(new InvokeModelCommand({
    modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(payload),
  }));

  const responseBody = JSON.parse(new TextDecoder().decode(result.body));
  const text = responseBody.content[0].text;

  let items;
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    items = JSON.parse(arrayMatch[0]);
  } else {
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (!objMatch) return response(500, { error: 'AI parse failed', code: 'E1001' });
    items = [JSON.parse(objMatch[0])];
  }

  const sessionId = `sess-${generateId()}`;
  const confirmItems = items.map((item, i) => ({
    tempId: `temp-${i}-${Date.now()}`,
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
  });
}

/**
 * POST /input/confirm（設計書 §9-1）
 * 確認済みアイテムをDynamoDBに保存
 */
async function handleConfirm(pk, inputBy, body) {
  const { sessionId, items } = body;
  if (!items || !Array.isArray(items)) {
    return response(400, { error: 'items array is required', code: 'E2001' });
  }

  const now = new Date().toISOString();
  const saved = [];

  for (const item of items) {
    const txnId = generateId();
    const record = {
      PK: pk,
      SK: `txn#${item.date}#${txnId}`,
      GSI1SK: `${item.category}#${item.date}`,
      GSI2SK: `month#${item.date.substring(0, 7)}`,
      txnId,
      amount: item.amount,
      category: item.category,
      shopName: item.shopName || null,
      memo: item.memo || null,
      date: item.date,
      inputMethod: 'text',
      inputBy,
      isFixed: false,
      aiConfidence: item.confidence,
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: record }));
    saved.push(record);
  }

  return response(201, { message: 'Saved', count: saved.length, transactions: saved });
}

function buildPrompt() {
  return `あなたは家計簿アプリ「Kakeibo AI」のカテゴライザーです。
ユーザーの入力から支出情報を抽出してJSON配列で返してください。

カテゴリ一覧:
${CATEGORIES.map(c => `- ${c}: ${CATEGORY_LABELS[c]}`).join('\n')}

ルール:
- 金額3,000円以上の外食 → food_premium
- スーパー・生鮮 → food_home
- ファミレス・ファストフード → food_restaurant
- 「昨日」→ 前日の日付、「先週末」→ 直前の土日
- 複数アイテムは配列で返す

出力: [{"shopName":"店名","amount":数値,"category":"コード","confidence":0.0-1.0,"date":"YYYY-MM-DD","memo":"原文","alternativeCategories":["代替1"]}]`;
}
