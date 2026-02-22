/**
 * Summary Handler（設計書 §9）
 * GET /summary?month=2026-02
 * 月次サマリー・カテゴリ別集計を返す
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.MAIN_TABLE;

const CATEGORY_LABELS = {
  food_home: '食費（自炊）', food_restaurant: '外食', food_premium: '外食（高級）',
  daily_goods: '日用品', children: '子供関連', education: '教育費',
  outing: '週末外出', travel: '旅行', medical: '医療費',
  utility: '光熱費・通信', insurance: '保険', loan: 'ローン',
  car: '車関連', hobby: '趣味', other: 'その他',
};

const FIXED_CATEGORIES = ['utility', 'insurance', 'loan', 'education'];

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

export async function handler(event) {
  const pk = getFamilyPK(event);
  const params = event.queryStringParameters || {};
  const now = new Date();
  const month = params.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  try {
    // 当月の取引を取得
    const txnResult = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': pk,
        ':prefix': `txn#${month}`,
      },
    }));

    const transactions = txnResult.Items || [];

    // 家族設定を取得（収入情報用）
    const settingsResult = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND SK = :sk',
      ExpressionAttributeValues: {
        ':pk': pk,
        ':sk': 'settings',
      },
    }));

    const settings = settingsResult.Items?.[0];
    const totalIncome = settings
      ? (settings.income?.selfMonthlyNet || 0) + (settings.income?.spouseMonthlyNet || 0) + (settings.income?.otherMonthlyIncome || 0)
      : 0;

    // カテゴリ別集計
    const categoryMap = {};
    let totalExpense = 0;
    let fixedCostsTotal = 0;
    let variableCostsTotal = 0;

    for (const txn of transactions) {
      const cat = txn.category || 'other';
      if (!categoryMap[cat]) {
        categoryMap[cat] = { amount: 0, count: 0 };
      }
      categoryMap[cat].amount += txn.amount;
      categoryMap[cat].count += 1;
      totalExpense += txn.amount;

      if (txn.isFixed || FIXED_CATEGORIES.includes(cat)) {
        fixedCostsTotal += txn.amount;
      } else {
        variableCostsTotal += txn.amount;
      }
    }

    const categoryBreakdown = Object.entries(categoryMap)
      .map(([category, data]) => ({
        category,
        label: CATEGORY_LABELS[category] || category,
        amount: data.amount,
        percentage: totalExpense > 0 ? Math.round((data.amount / totalExpense) * 100) : 0,
        count: data.count,
      }))
      .sort((a, b) => b.amount - a.amount);

    // 前月比（前月データ取得）
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    const prevResult = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': pk,
        ':prefix': `txn#${prevMonth}`,
      },
      Select: 'COUNT',
    }));

    // 前月の合計を簡易計算
    let prevTotal = 0;
    if (prevResult.Count > 0) {
      const prevItems = await docClient.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: {
          ':pk': pk,
          ':prefix': `txn#${prevMonth}`,
        },
        ProjectionExpression: 'amount',
      }));
      prevTotal = (prevItems.Items || []).reduce((sum, item) => sum + (item.amount || 0), 0);
    }

    const comparedToPrevMonth = prevTotal > 0 ? Math.round(((totalExpense - prevTotal) / prevTotal) * 100) : 0;

    return response(200, {
      month,
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      remainingBudget: totalIncome - totalExpense,
      categoryBreakdown,
      comparedToPrevMonth,
      fixedCostsTotal,
      variableCostsTotal,
    });
  } catch (err) {
    console.error('Summary Error:', err);
    return response(500, { error: 'Failed to generate summary' });
  }
}
