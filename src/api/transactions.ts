import type {
  Transaction, MonthlySummary, ConfirmItem,
  InputRequest, InputResponse, ConfirmRequest,
  Category, CATEGORY_LABELS,
} from '../types';
import { generateId } from '../utils/id';
import { formatDate, formatMonth } from '../utils/format';
import { matchPattern } from '../utils/pattern-analyzer';
import type { PatternKnowledge, ContextKnowledge } from '../types';

const STORAGE_KEY = 'kakeibo_transactions';
const FAMILY_ID = 'demo-family'; // TODO: Cognito familyIdから取得

// ========================================
// ローカルストレージベースの仮実装
// AWS接続後にAPI呼び出しに差し替え（設計書 §9 準拠）
// ========================================

function getStoredTransactions(): Transaction[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveStoredTransactions(txns: Transaction[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(txns));
}

/** POST /input — AI入力処理 */
export async function submitInput(req: InputRequest): Promise<InputResponse> {
  // TODO: return apiClient.post<InputResponse>('/input', req);
  const result = mockCategorize(req.content);
  const tempId = generateId();

  return {
    sessionId: `session_${generateId()}`,
    items: [
      {
        tempId,
        amount: result.amount,
        category: result.category,
        categoryLabel: result.categoryLabel,
        shopName: result.shopName,
        date: result.date,
        memo: result.memo,
        confidence: result.confidence,
        alternativeCategories: result.alternativeCategories,
      },
    ],
    needsClarification: false,
  };
}

/** POST /input/confirm — 確認後に保存 */
export async function confirmInput(req: ConfirmRequest): Promise<string[]> {
  // TODO: return apiClient.post<{ savedTransactionIds: string[] }>('/input/confirm', req);
  const ids: string[] = [];
  const now = new Date().toISOString();
  const txns = getStoredTransactions();

  for (const item of req.items) {
    const txnId = generateId();
    const txn: Transaction = {
      PK: `family_${FAMILY_ID}`,
      SK: `txn#${item.date}#${txnId}`,
      txnId,
      amount: item.amount,
      category: item.category,
      shopName: item.shopName,
      memo: item.memo,
      date: item.date,
      inputMethod: 'text',
      inputBy: 'primary',
      isFixed: false,
      aiConfidence: 0.7,
      createdAt: now,
      updatedAt: now,
    };
    txns.push(txn);
    ids.push(txnId);
  }

  saveStoredTransactions(txns);
  return ids;
}

/** 支出記録を保存（直接保存用） */
export async function saveTransaction(
  txn: Omit<Transaction, 'PK' | 'SK' | 'txnId' | 'createdAt' | 'updatedAt'>
): Promise<Transaction> {
  const now = new Date().toISOString();
  const txnId = generateId();
  const newTxn: Transaction = {
    ...txn,
    PK: `family_${FAMILY_ID}`,
    SK: `txn#${txn.date}#${txnId}`,
    txnId,
    createdAt: now,
    updatedAt: now,
  };

  const txns = getStoredTransactions();
  txns.push(newTxn);
  saveStoredTransactions(txns);
  return newTxn;
}

/** 支出記録を更新 */
export async function updateTransaction(
  txnId: string,
  updates: Partial<Transaction>
): Promise<Transaction> {
  // TODO: return apiClient.put<Transaction>(`/transactions/${txnId}`, updates);
  const txns = getStoredTransactions();
  const idx = txns.findIndex(t => t.txnId === txnId);
  if (idx === -1) throw new Error(`Transaction not found: ${txnId}`);

  txns[idx] = {
    ...txns[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  saveStoredTransactions(txns);
  return txns[idx];
}

/** 支出記録を削除 */
export async function deleteTransaction(txnId: string): Promise<void> {
  // TODO: return apiClient.delete(`/transactions/${txnId}`);
  const txns = getStoredTransactions().filter(t => t.txnId !== txnId);
  saveStoredTransactions(txns);
}

/** GET /transactions — 期間指定で記録を取得 */
export async function getTransactions(month?: string): Promise<Transaction[]> {
  // TODO: return apiClient.get<{ items: Transaction[] }>('/transactions', { from, to });
  const txns = getStoredTransactions();
  if (!month) return txns.sort((a, b) => b.date.localeCompare(a.date));

  return txns
    .filter(t => t.date.startsWith(month))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** GET /summary — 月次サマリーを取得 */
export async function getMonthlySummary(month?: string): Promise<MonthlySummary> {
  // TODO: return apiClient.get<MonthlySummary>('/summary', { month });
  const targetMonth = month || formatMonth(new Date());
  const txns = await getTransactions(targetMonth);

  const fixedCostsTotal = txns
    .filter(t => t.isFixed)
    .reduce((sum, t) => sum + t.amount, 0);

  const variableCostsTotal = txns
    .filter(t => !t.isFixed)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = fixedCostsTotal + variableCostsTotal;

  // 収入は家族設定から取得
  const settingsStr = localStorage.getItem('kakeibo_family_settings');
  const settings = settingsStr ? JSON.parse(settingsStr) : null;
  const totalIncome = settings
    ? (settings.income?.selfMonthlyNet || 0) +
      (settings.income?.spouseMonthlyNet || 0) +
      (settings.income?.otherMonthlyIncome || 0)
    : 0;

  // 前月データ取得（前月比計算）
  const [y, m] = targetMonth.split('-').map(Number);
  const prevDate = new Date(y, m - 2, 1);
  const prevMonth = formatMonth(prevDate);
  const prevTxns = getStoredTransactions().filter(t => t.date.startsWith(prevMonth));
  const prevTotal = prevTxns.reduce((sum, t) => sum + t.amount, 0);

  // カテゴリ別集計
  const { CATEGORY_LABELS: labels } = require('../types');
  const categoryMap = new Map<string, { amount: number; count: number }>();
  for (const t of txns) {
    const existing = categoryMap.get(t.category) || { amount: 0, count: 0 };
    categoryMap.set(t.category, {
      amount: existing.amount + t.amount,
      count: existing.count + 1,
    });
  }

  // 予算設定取得
  const budgets = settings?.monthlyBudget || {};

  const categoryBreakdown = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category: category as Category,
      label: (labels as Record<string, string>)[category] || category,
      amount: data.amount,
      budgetAmount: budgets[category] as number | undefined,
      count: data.count,
      percentage: totalExpense > 0 ? (data.amount / totalExpense) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    month: targetMonth,
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    remainingBudget: totalIncome - totalExpense,
    categoryBreakdown,
    comparedToPrevMonth: totalExpense - prevTotal,
    fixedCostsTotal,
    variableCostsTotal,
  };
}

/** GET /summary/yearly — 年間月別サマリーを取得 */
export async function getYearlySummary(year?: number): Promise<MonthlySummary[]> {
  const targetYear = year || new Date().getFullYear();
  const summaries: MonthlySummary[] = [];

  for (let m = 1; m <= 12; m++) {
    const month = `${targetYear}-${String(m).padStart(2, '0')}`;
    const summary = await getMonthlySummary(month);
    summaries.push(summary);
  }

  return summaries;
}

// ========================================
// ルールベースの仮分類（設計書 §12-2 フォールバック）
// AgentCore タイムアウト時にも使用
// ========================================

interface MockResult {
  shopName?: string;
  amount: number;
  category: Category;
  categoryLabel: string;
  confidence: number;
  date: string;
  memo?: string;
  alternativeCategories: { category: Category; label: string }[];
}

function mockCategorize(input: string): MockResult {
  const today = formatDate(new Date());
  const amountMatch = input.match(/(\d[\d,]*)\s*円?/);
  const amount = amountMatch
    ? parseInt(amountMatch[1].replace(/,/g, ''), 10)
    : 0;

  // 「くらい」「ほど」は設計書の補完ルールに従いそのまま数値化
  const categoryLabels: Record<Category, string> = {
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

  // 設計書 §5-1 文脈ナレッジ + 設計書 §8-3 キーワード分類
  const rules: { keywords: string[]; category: Category }[] = [
    { keywords: ['スーパー', 'イオン', 'ライフ', 'ヨーカドー', 'OK', '西友', 'まいばすけっと', 'コストコ', '食材', '自炊'], category: 'food_home' },
    { keywords: ['ファミレス', 'サイゼリア', 'マクドナルド', 'マック', 'ランチ', '定食', 'ラーメン', '外食', '牛丼', 'すき家'], category: 'food_restaurant' },
    { keywords: ['叙々苑', '焼肉', '寿司屋', '高い店', '懐石', 'フレンチ', 'イタリアン'], category: 'food_premium' },
    { keywords: ['ドラッグストア', '洗剤', 'ティッシュ', '日用品', 'トイレットペーパー', 'シャンプー'], category: 'daily_goods' },
    { keywords: ['おむつ', 'ミルク', 'ベビー', '子供', 'おもちゃ', 'キッズ'], category: 'children' },
    { keywords: ['塾', '習い事', 'ピアノ', 'プール', '参考書', '教材', '学校'], category: 'education' },
    { keywords: ['お出かけ', '遊園地', '公園', '水族館', '動物園', '映画', 'ボーリング', 'レジャー'], category: 'outing' },
    { keywords: ['旅行', 'ホテル', '宿泊', '温泉', '旅館'], category: 'travel' },
    { keywords: ['病院', '薬局', '医療', '薬', 'クリニック', '歯医者'], category: 'medical' },
    { keywords: ['電気', 'ガス', '水道', '光熱', 'スマホ', '携帯', 'WiFi', 'ネット', '通信'], category: 'utility' },
    { keywords: ['保険'], category: 'insurance' },
    { keywords: ['ローン', '返済', '住宅ローン'], category: 'loan' },
    { keywords: ['ガソリン', '車検', '駐車場', 'ETC', 'カー用品'], category: 'car' },
    { keywords: ['飲み会', '居酒屋', 'バンド', '趣味', 'ライブ', 'バー'], category: 'hobby' },
  ];

  let category: Category = 'other';
  let storeName: string | undefined;
  let confidence = 0.65;

  // 1. 承認済みパターンマッチ（最高優先度 §5-2）
  const patternsStr = localStorage.getItem('kakeibo_patterns');
  const patterns: PatternKnowledge[] = patternsStr ? JSON.parse(patternsStr) : [];
  const patternMatch = matchPattern(input, amount, patterns);

  // 2. コンテキストルールマッチ（§5-1 店舗→カテゴリ）
  const contextStr = localStorage.getItem('kakeibo_context_rules');
  const context: ContextKnowledge = contextStr ? JSON.parse(contextStr) : { shopToCategory: {}, keywordToCategory: {} };

  if (patternMatch) {
    // パターンマッチが最優先
    category = patternMatch.category;
    confidence = patternMatch.confidence;
  } else {
    // コンテキストルール → キーワードルール
    let contextMatched = false;
    for (const [shop, cat] of Object.entries(context.shopToCategory)) {
      if (input.includes(shop)) {
        category = cat;
        storeName = shop;
        confidence = 0.9;
        contextMatched = true;
        break;
      }
    }

    if (!contextMatched) {
      for (const rule of rules) {
        if (rule.keywords.some(kw => input.includes(kw))) {
          category = rule.category;
          const storeMatch = rule.keywords.find(kw => input.includes(kw) && kw.length > 2);
          if (storeMatch) storeName = storeMatch;
          confidence = storeName ? 0.85 : 0.65;
          break;
        }
      }
    }
  }

  // 日付推定（設計書 §8-1 補完ルール）
  let date = today;
  if (input.includes('昨日')) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    date = formatDate(d);
  } else if (input.includes('先週末')) {
    const d = new Date();
    const dayOfWeek = d.getDay();
    d.setDate(d.getDate() - dayOfWeek - 1); // 直前の土曜日
    date = formatDate(d);
  }

  // 代替カテゴリ候補（top 3）
  const alternatives: Category[] = ['food_home', 'food_restaurant', 'outing', 'daily_goods', 'other']
    .filter(c => c !== category)
    .slice(0, 3) as Category[];

  return {
    shopName: storeName,
    amount,
    category,
    categoryLabel: categoryLabels[category],
    confidence,
    date,
    memo: input,
    alternativeCategories: alternatives.map(c => ({
      category: c,
      label: categoryLabels[c],
    })),
  };
}
