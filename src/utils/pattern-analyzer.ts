import type { Transaction, Category, PatternKnowledge, ContextKnowledge } from '../types';
import { CATEGORY_LABELS } from '../types';
import { generateId } from './id';

/**
 * パターン分析エンジン（設計書 §5-2 準拠）
 * 取引履歴からショップ→カテゴリマッピングと定期パターンを検出
 */

/** ショップ別の集計結果 */
interface ShopAggregation {
  shopName: string;
  category: Category;
  totalAmount: number;
  count: number;
  averageAmount: number;
  dates: string[];
}

/** 曜日別集計 */
interface DayOfWeekAggregation {
  category: Category;
  dayOfWeek: number; // 0=日, 1=月, ..., 6=土
  count: number;
  totalAmount: number;
}

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

/** 取引履歴からショップ→カテゴリのコンテキストルールを抽出 */
export function extractContextRules(transactions: Transaction[]): ContextKnowledge {
  const shopCategoryCount = new Map<string, Map<Category, number>>();

  for (const txn of transactions) {
    if (!txn.shopName) continue;
    const shop = txn.shopName;

    if (!shopCategoryCount.has(shop)) {
      shopCategoryCount.set(shop, new Map());
    }
    const catMap = shopCategoryCount.get(shop)!;
    catMap.set(txn.category, (catMap.get(txn.category) || 0) + 1);
  }

  const shopToCategory: Record<string, Category> = {};
  for (const [shop, catMap] of shopCategoryCount) {
    // 最も多いカテゴリを採用（2回以上の場合のみ）
    let maxCount = 0;
    let maxCategory: Category = 'other';
    for (const [cat, count] of catMap) {
      if (count > maxCount) {
        maxCount = count;
        maxCategory = cat;
      }
    }
    if (maxCount >= 2) {
      shopToCategory[shop] = maxCategory;
    }
  }

  return {
    shopToCategory,
    keywordToCategory: {},
  };
}

/** 取引履歴からパターンを検出 */
export function detectPatterns(transactions: Transaction[]): PatternKnowledge[] {
  if (transactions.length < 3) return [];

  const patterns: PatternKnowledge[] = [];
  const now = new Date().toISOString();

  // 1. ショップ別パターン検出
  const shopPatterns = detectShopPatterns(transactions);
  patterns.push(...shopPatterns.map(sp => ({
    patternId: `pat-${generateId()}`,
    description: `${sp.shopName}での買い物`,
    category: sp.category,
    averageAmount: sp.averageAmount,
    frequency: sp.frequency,
    dayOfWeek: sp.dayOfWeek,
    countPerWeek: sp.countPerWeek,
    detectedAt: now,
    status: 'pending' as const,
  })));

  // 2. カテゴリ別の曜日パターン検出
  const dayPatterns = detectDayOfWeekPatterns(transactions);
  patterns.push(...dayPatterns.map(dp => ({
    patternId: `pat-${generateId()}`,
    description: dp.description,
    category: dp.category,
    averageAmount: dp.averageAmount,
    frequency: 'weekly' as const,
    dayOfWeek: dp.dayOfWeek,
    countPerWeek: dp.countPerWeek,
    detectedAt: now,
    status: 'pending' as const,
  })));

  return patterns;
}

interface DetectedShopPattern {
  shopName: string;
  category: Category;
  averageAmount: number;
  frequency: 'weekly' | 'monthly';
  dayOfWeek?: string[];
  countPerWeek?: number;
}

function detectShopPatterns(transactions: Transaction[]): DetectedShopPattern[] {
  // ショップ別に集計
  const shopMap = new Map<string, ShopAggregation>();

  for (const txn of transactions) {
    if (!txn.shopName) continue;
    const shop = txn.shopName;

    if (!shopMap.has(shop)) {
      shopMap.set(shop, {
        shopName: shop,
        category: txn.category,
        totalAmount: 0,
        count: 0,
        averageAmount: 0,
        dates: [],
      });
    }

    const agg = shopMap.get(shop)!;
    agg.totalAmount += txn.amount;
    agg.count += 1;
    agg.dates.push(txn.date);
  }

  const patterns: DetectedShopPattern[] = [];

  for (const [, agg] of shopMap) {
    if (agg.count < 3) continue; // 3回以上の利用が必要

    agg.averageAmount = Math.round(agg.totalAmount / agg.count);

    // 曜日分析
    const dayCount = new Map<number, number>();
    for (const dateStr of agg.dates) {
      const day = new Date(dateStr).getDay();
      dayCount.set(day, (dayCount.get(day) || 0) + 1);
    }

    // 特定の曜日に集中しているか（50%以上）
    const dominantDays: string[] = [];
    for (const [day, count] of dayCount) {
      if (count / agg.count >= 0.4) {
        dominantDays.push(DAY_NAMES[day]);
      }
    }

    // 頻度推定（日付の間隔から）
    const sortedDates = agg.dates.sort();
    const intervals: number[] = [];
    for (let i = 1; i < sortedDates.length; i++) {
      const diff = (new Date(sortedDates[i]).getTime() - new Date(sortedDates[i - 1]).getTime()) / (1000 * 60 * 60 * 24);
      intervals.push(diff);
    }

    const avgInterval = intervals.length > 0
      ? intervals.reduce((a, b) => a + b, 0) / intervals.length
      : 30;

    const frequency: 'weekly' | 'monthly' = avgInterval < 14 ? 'weekly' : 'monthly';

    patterns.push({
      shopName: agg.shopName,
      category: agg.category,
      averageAmount: agg.averageAmount,
      frequency,
      dayOfWeek: dominantDays.length > 0 ? dominantDays : undefined,
      countPerWeek: frequency === 'weekly' ? Math.round(7 / avgInterval * 10) / 10 : undefined,
    });
  }

  return patterns;
}

interface DetectedDayPattern {
  description: string;
  category: Category;
  averageAmount: number;
  dayOfWeek: string[];
  countPerWeek: number;
}

function detectDayOfWeekPatterns(transactions: Transaction[]): DetectedDayPattern[] {
  // カテゴリ×曜日の集計
  const catDayMap = new Map<string, DayOfWeekAggregation>();

  for (const txn of transactions) {
    const day = new Date(txn.date).getDay();
    const key = `${txn.category}_${day}`;

    if (!catDayMap.has(key)) {
      catDayMap.set(key, {
        category: txn.category,
        dayOfWeek: day,
        count: 0,
        totalAmount: 0,
      });
    }

    const agg = catDayMap.get(key)!;
    agg.count += 1;
    agg.totalAmount += txn.amount;
  }

  // カテゴリごとの合計取得
  const catTotal = new Map<Category, { count: number; amount: number }>();
  for (const txn of transactions) {
    const existing = catTotal.get(txn.category) || { count: 0, amount: 0 };
    catTotal.set(txn.category, {
      count: existing.count + 1,
      amount: existing.amount + txn.amount,
    });
  }

  const patterns: DetectedDayPattern[] = [];

  // カテゴリ別に曜日集中を検出
  const categoryDays = new Map<Category, { day: number; count: number; amount: number }[]>();

  for (const [, agg] of catDayMap) {
    const total = catTotal.get(agg.category);
    if (!total || total.count < 4) continue;

    // この曜日が全体の30%以上を占めるか
    if (agg.count / total.count >= 0.3) {
      if (!categoryDays.has(agg.category)) {
        categoryDays.set(agg.category, []);
      }
      categoryDays.get(agg.category)!.push({
        day: agg.dayOfWeek,
        count: agg.count,
        amount: agg.totalAmount,
      });
    }
  }

  for (const [category, days] of categoryDays) {
    if (days.length === 0) continue;

    const totalCount = days.reduce((sum, d) => sum + d.count, 0);
    const totalAmount = days.reduce((sum, d) => sum + d.amount, 0);
    const dayNames = days.map(d => DAY_NAMES[d.day]);

    // 週末パターン（土日に集中）
    const isWeekend = days.every(d => d.day === 0 || d.day === 6);
    const label = CATEGORY_LABELS[category];

    patterns.push({
      description: isWeekend
        ? `週末の${label}`
        : `${dayNames.join('・')}曜の${label}`,
      category,
      averageAmount: Math.round(totalAmount / totalCount),
      dayOfWeek: dayNames,
      countPerWeek: Math.round(totalCount / Math.max(getWeekSpan(transactions), 1) * 10) / 10,
    });
  }

  return patterns;
}

/** 取引データの期間（週数） */
function getWeekSpan(transactions: Transaction[]): number {
  if (transactions.length < 2) return 1;
  const dates = transactions.map(t => new Date(t.date).getTime());
  const min = Math.min(...dates);
  const max = Math.max(...dates);
  return Math.max(Math.round((max - min) / (7 * 24 * 60 * 60 * 1000)), 1);
}

/** 承認済みパターンを使って分類の信頼度を上げる */
export function matchPattern(
  input: string,
  amount: number,
  patterns: PatternKnowledge[],
): { category: Category; confidence: number; patternId: string } | null {
  const approvedPatterns = patterns.filter(p => p.status === 'approved');
  if (approvedPatterns.length === 0) return null;

  // ショップ名マッチ
  for (const pattern of approvedPatterns) {
    const shopName = pattern.description.replace('での買い物', '');
    if (input.includes(shopName)) {
      return {
        category: pattern.category,
        confidence: 0.9,
        patternId: pattern.patternId,
      };
    }
  }

  // 金額レンジマッチ（±30%以内）
  for (const pattern of approvedPatterns) {
    const lower = pattern.averageAmount * 0.7;
    const upper = pattern.averageAmount * 1.3;
    if (amount >= lower && amount <= upper) {
      // カテゴリヒントになりうるが、金額だけでは弱い
      const today = new Date();
      const dayName = DAY_NAMES[today.getDay()];
      if (pattern.dayOfWeek?.includes(dayName)) {
        return {
          category: pattern.category,
          confidence: 0.75,
          patternId: pattern.patternId,
        };
      }
    }
  }

  return null;
}
