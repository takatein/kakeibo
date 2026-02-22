import type { Transaction, MonthlySummary, AiCategorizationResult } from '../types';
import { apiClient } from './client';
import { generateId } from '../utils/id';
import { formatDate, formatMonth } from '../utils/format';

const STORAGE_KEY = 'kakeibo_transactions';

// ========================================
// ローカルストレージベースの仮実装
// AWS接続後にAPI呼び出しに差し替え
// ========================================

function getStoredTransactions(): Transaction[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveTransactions(txns: Transaction[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(txns));
}

/** 支出記録を保存 */
export async function saveTransaction(
  txn: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Transaction> {
  // TODO: Replace with API call
  // return apiClient.post<Transaction>('/transactions', txn);

  const now = new Date().toISOString();
  const newTxn: Transaction = {
    ...txn,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };

  const txns = getStoredTransactions();
  txns.push(newTxn);
  saveTransactions(txns);
  return newTxn;
}

/** 支出記録を更新 */
export async function updateTransaction(
  id: string,
  updates: Partial<Transaction>
): Promise<Transaction> {
  const txns = getStoredTransactions();
  const idx = txns.findIndex(t => t.id === id);
  if (idx === -1) throw new Error(`Transaction not found: ${id}`);

  txns[idx] = {
    ...txns[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  saveTransactions(txns);
  return txns[idx];
}

/** 支出記録を削除 */
export async function deleteTransaction(id: string): Promise<void> {
  const txns = getStoredTransactions().filter(t => t.id !== id);
  saveTransactions(txns);
}

/** 期間指定で記録を取得 */
export async function getTransactions(month?: string): Promise<Transaction[]> {
  // TODO: Replace with API call
  // return apiClient.get<Transaction[]>('/transactions', { month });

  const txns = getStoredTransactions();
  if (!month) return txns.sort((a, b) => b.date.localeCompare(a.date));

  return txns
    .filter(t => t.date.startsWith(month))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** 月次サマリーを取得 */
export async function getMonthlySummary(month?: string): Promise<MonthlySummary> {
  const targetMonth = month || formatMonth(new Date());
  const txns = await getTransactions(targetMonth);

  const fixedExpense = txns
    .filter(t => t.isFixed)
    .reduce((sum, t) => sum + t.amount, 0);

  const variableExpense = txns
    .filter(t => !t.isFixed)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = fixedExpense + variableExpense;

  // 収入は家族設定から取得（仮値）
  const settingsStr = localStorage.getItem('kakeibo_family_settings');
  const settings = settingsStr ? JSON.parse(settingsStr) : null;
  const totalIncome = settings?.monthlyIncome || 0;

  // カテゴリ別集計
  const categoryMap = new Map<string, { amount: number; count: number }>();
  for (const t of txns) {
    const existing = categoryMap.get(t.category) || { amount: 0, count: 0 };
    categoryMap.set(t.category, {
      amount: existing.amount + t.amount,
      count: existing.count + 1,
    });
  }

  const categoryBreakdown = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category: category as Transaction['category'],
      amount: data.amount,
      count: data.count,
      percentage: totalExpense > 0 ? (data.amount / totalExpense) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    month: targetMonth,
    totalIncome,
    totalExpense,
    fixedExpense,
    variableExpense,
    balance: totalIncome - totalExpense,
    categoryBreakdown,
  };
}

/** AI分類リクエスト */
export async function categorizeWithAi(input: string): Promise<AiCategorizationResult> {
  // TODO: Replace with actual Bedrock AgentCore API call
  // return apiClient.post<AiCategorizationResult>('/ai/categorize', { input });

  // 仮実装: ルールベースで分類
  return mockCategorize(input);
}

/** ルールベースの仮分類 */
function mockCategorize(input: string): AiCategorizationResult {
  const today = formatDate(new Date());
  const amountMatch = input.match(/(\d[\d,]*)\s*円?/);
  const amount = amountMatch
    ? parseInt(amountMatch[1].replace(/,/g, ''), 10)
    : 0;

  // キーワードベースの簡易分類
  const rules: { keywords: string[]; category: Transaction['category']; storeName?: string }[] = [
    { keywords: ['スーパー', 'イオン', 'ヨーカドー', 'ライフ', 'OK', '西友', 'まいばすけっと', '自炊', '食材'], category: 'food_cooking' },
    { keywords: ['ランチ', 'レストラン', '定食', 'ファミレス', 'マクドナルド', 'マック', '外食', '寿司', 'ラーメン'], category: 'food_eating_out' },
    { keywords: ['Uber', 'ウーバー', '出前', 'デリバリー'], category: 'food_delivery' },
    { keywords: ['飲み', '居酒屋', '飲み会', 'バー', '二次会'], category: 'drinking' },
    { keywords: ['電車', 'バス', 'タクシー', 'Suica', 'PASMO', '交通'], category: 'transportation' },
    { keywords: ['映画', 'ゲーム', '遊園地', 'レジャー', '旅行', 'ホテル'], category: 'entertainment' },
    { keywords: ['ユニクロ', 'GU', 'ZARA', '服', '靴', '衣'], category: 'clothing' },
    { keywords: ['病院', '薬局', '医療', '薬', 'クリニック'], category: 'medical' },
    { keywords: ['塾', '習い事', '学校', '教育', '参考書'], category: 'education' },
    { keywords: ['家賃', 'マンション', '住宅'], category: 'housing' },
    { keywords: ['電気', 'ガス', '水道', '光熱'], category: 'utilities' },
    { keywords: ['スマホ', '携帯', 'WiFi', 'ネット', '通信'], category: 'communication' },
    { keywords: ['保険'], category: 'insurance' },
    { keywords: ['ローン', '返済', '住宅ローン'], category: 'loan' },
    { keywords: ['おむつ', 'ミルク', 'ベビー', '子供'], category: 'childcare' },
    { keywords: ['美容院', 'ヘアサロン', '化粧品', 'コスメ'], category: 'beauty' },
    { keywords: ['Netflix', 'Amazon Prime', 'Spotify', 'サブスク', '月額'], category: 'subscription' },
    { keywords: ['ドラッグストア', '洗剤', 'ティッシュ', '日用品', 'トイレットペーパー'], category: 'daily_necessities' },
  ];

  let category: Transaction['category'] = 'other';
  let storeName: string | undefined;

  for (const rule of rules) {
    if (rule.keywords.some(kw => input.includes(kw))) {
      category = rule.category;
      // 店名候補を抽出
      const storeMatch = rule.keywords.find(kw => input.includes(kw) && kw.length > 2);
      if (storeMatch) storeName = storeMatch;
      break;
    }
  }

  return {
    storeName,
    amount,
    category,
    confidence: 0.7,
    date: today,
    memo: input,
  };
}
