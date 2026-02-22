/**
 * Pattern Analyzer（設計書 §8-3 Categorizer Agent パターン検出）
 * EventBridge Scheduler で毎日深夜1時に実行
 * 直近30日の取引からパターンを検出し、knowledge テーブルに保存
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.BEDROCK_REGION || 'ap-northeast-1',
});

const MAIN_TABLE = process.env.MAIN_TABLE;
const KNOWLEDGE_TABLE = process.env.KNOWLEDGE_TABLE;

export async function handler(event) {
  console.log('Pattern Analyzer started');

  try {
    // 全家族のデータを処理（本番ではスケーラブルな方式に改善）
    const families = await getActiveFamilies();

    for (const familyPK of families) {
      await analyzeFamily(familyPK);
    }

    console.log(`Pattern analysis complete for ${families.length} families`);
    return { statusCode: 200, body: 'Pattern analysis complete' };
  } catch (err) {
    console.error('Pattern Analyzer Error:', err);
    throw err;
  }
}

async function getActiveFamilies() {
  // settings レコードを持つ家族を取得
  const result = await docClient.send(new ScanCommand({
    TableName: MAIN_TABLE,
    FilterExpression: 'SK = :sk',
    ExpressionAttributeValues: { ':sk': 'settings' },
    ProjectionExpression: 'PK',
  }));

  return (result.Items || []).map(item => item.PK);
}

async function analyzeFamily(pk) {
  // 直近30日の取引を取得
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fromDate = thirtyDaysAgo.toISOString().split('T')[0];

  const result = await docClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    KeyConditionExpression: 'PK = :pk AND SK BETWEEN :from AND :to',
    ExpressionAttributeValues: {
      ':pk': pk,
      ':from': `txn#${fromDate}`,
      ':to': `txn#9999`,
    },
  }));

  const transactions = result.Items || [];
  if (transactions.length < 5) return; // データ不足

  // 店名ごとの集計
  const shopPatterns = {};
  for (const txn of transactions) {
    if (!txn.shopName) continue;
    const shop = txn.shopName;
    if (!shopPatterns[shop]) {
      shopPatterns[shop] = { category: {}, amounts: [], dates: [] };
    }
    shopPatterns[shop].category[txn.category] = (shopPatterns[shop].category[txn.category] || 0) + 1;
    shopPatterns[shop].amounts.push(txn.amount);
    shopPatterns[shop].dates.push(txn.date);
  }

  // 3回以上出現する店舗のパターンを検出
  const patterns = [];
  for (const [shop, data] of Object.entries(shopPatterns)) {
    const totalCount = data.amounts.length;
    if (totalCount < 3) continue;

    const topCategory = Object.entries(data.category)
      .sort(([, a], [, b]) => b - a)[0][0];
    const avgAmount = Math.round(data.amounts.reduce((a, b) => a + b, 0) / totalCount);

    // 頻度を推定
    const dayDiffs = [];
    const sortedDates = data.dates.sort();
    for (let i = 1; i < sortedDates.length; i++) {
      const diff = (new Date(sortedDates[i]) - new Date(sortedDates[i - 1])) / (24 * 60 * 60 * 1000);
      dayDiffs.push(diff);
    }
    const avgInterval = dayDiffs.length > 0 ? dayDiffs.reduce((a, b) => a + b, 0) / dayDiffs.length : 30;
    const frequency = avgInterval < 14 ? 'weekly' : 'monthly';

    patterns.push({
      PK: pk,
      SK: `pattern#${shop.replace(/\s/g, '_')}`,
      patternId: `pat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      description: `${shop}での${topCategory}（平均${avgAmount}円、${frequency === 'weekly' ? '毎週' : '毎月'}）`,
      category: topCategory,
      averageAmount: avgAmount,
      frequency,
      countPerWeek: frequency === 'weekly' ? Math.round(7 / avgInterval) : undefined,
      detectedAt: new Date().toISOString(),
      status: 'pending',
    });
  }

  // ナレッジテーブルに保存
  for (const pattern of patterns) {
    await docClient.send(new PutCommand({
      TableName: KNOWLEDGE_TABLE,
      Item: pattern,
      ConditionExpression: 'attribute_not_exists(SK)',
    }).catch(() => {
      // 既に存在する場合はスキップ
    }));
  }

  // 文脈ナレッジ（shopToCategory マッピング）を更新
  const shopToCategory = {};
  for (const [shop, data] of Object.entries(shopPatterns)) {
    if (data.amounts.length >= 2) {
      shopToCategory[shop] = Object.entries(data.category)
        .sort(([, a], [, b]) => b - a)[0][0];
    }
  }

  if (Object.keys(shopToCategory).length > 0) {
    await docClient.send(new PutCommand({
      TableName: KNOWLEDGE_TABLE,
      Item: {
        PK: pk,
        SK: 'context#rules',
        shopToCategory,
        updatedAt: new Date().toISOString(),
      },
    }));
  }

  console.log(`Family ${pk}: ${patterns.length} patterns detected, ${Object.keys(shopToCategory).length} shop mappings`);
}
