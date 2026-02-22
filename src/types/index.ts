// ========================================
// Kakeibo AI - Type Definitions
// ========================================

/** 入力方式 */
export type InputMethod = 'text' | 'voice' | 'receipt';

/** 入力者 */
export type InputBy = 'husband' | 'wife';

/** カテゴリ */
export type Category =
  | 'food_cooking'      // 食費（自炊）
  | 'food_eating_out'   // 食費（外食）
  | 'food_delivery'     // 食費（デリバリー）
  | 'drinking'          // 飲み会
  | 'daily_necessities' // 日用品
  | 'transportation'    // 交通費
  | 'entertainment'     // 娯楽・レジャー
  | 'clothing'          // 衣服
  | 'medical'           // 医療費
  | 'education'         // 教育費
  | 'housing'           // 住居費
  | 'utilities'         // 水道光熱費
  | 'communication'     // 通信費
  | 'insurance'         // 保険
  | 'loan'              // ローン
  | 'childcare'         // 子育て
  | 'beauty'            // 美容
  | 'subscription'      // サブスクリプション
  | 'other';            // その他

/** カテゴリ表示名マッピング */
export const CATEGORY_LABELS: Record<Category, string> = {
  food_cooking: '食費（自炊）',
  food_eating_out: '食費（外食）',
  food_delivery: '食費（デリバリー）',
  drinking: '飲み会',
  daily_necessities: '日用品',
  transportation: '交通費',
  entertainment: '娯楽・レジャー',
  clothing: '衣服',
  medical: '医療費',
  education: '教育費',
  housing: '住居費',
  utilities: '水道光熱費',
  communication: '通信費',
  insurance: '保険',
  loan: 'ローン',
  childcare: '子育て',
  beauty: '美容',
  subscription: 'サブスク',
  other: 'その他',
};

/** カテゴリ色マッピング */
export const CATEGORY_COLORS: Record<Category, string> = {
  food_cooking: '#22c55e',
  food_eating_out: '#f97316',
  food_delivery: '#ef4444',
  drinking: '#a855f7',
  daily_necessities: '#06b6d4',
  transportation: '#3b82f6',
  entertainment: '#eab308',
  clothing: '#ec4899',
  medical: '#14b8a6',
  education: '#8b5cf6',
  housing: '#64748b',
  utilities: '#f59e0b',
  communication: '#6366f1',
  insurance: '#0ea5e9',
  loan: '#dc2626',
  childcare: '#d946ef',
  beauty: '#f472b6',
  subscription: '#7c3aed',
  other: '#94a3b8',
};

/** 支出記録 */
export interface Transaction {
  id: string;
  userId: string;
  date: string;          // YYYY-MM-DD
  amount: number;
  category: Category;
  storeName?: string;
  memo?: string;
  inputMethod: InputMethod;
  inputBy: InputBy;
  isFixed: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 固定費マスタ */
export interface FixedCost {
  id: string;
  userId: string;
  name: string;
  amount: number;
  category: Category;
  billingDay: number;     // 毎月の計上日（1-28）
  startAge?: number;      // 開始年齢トリガー
  endAge?: number;        // 終了年齢トリガー
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 家族設定 */
export interface FamilySettings {
  userId: string;
  husbandName: string;
  wifeName: string;
  husbandBirthYear: number;
  wifeBirthYear: number;
  children: ChildInfo[];
  monthlyIncome: number;
  bonusPerYear: number;
  retirementAge: number;
}

/** 子供情報 */
export interface ChildInfo {
  name: string;
  birthYear: number;
  educationPlan: 'public' | 'private' | 'mixed';
}

/** 月次サマリー */
export interface MonthlySummary {
  month: string;           // YYYY-MM
  totalIncome: number;
  totalExpense: number;
  fixedExpense: number;
  variableExpense: number;
  balance: number;
  categoryBreakdown: CategoryBreakdown[];
}

/** カテゴリ別集計 */
export interface CategoryBreakdown {
  category: Category;
  amount: number;
  count: number;
  percentage: number;
}

/** AI分類結果 */
export interface AiCategorizationResult {
  storeName?: string;
  amount: number;
  category: Category;
  confidence: number;
  date: string;
  memo?: string;
}

/** 認証ユーザー */
export interface AuthUser {
  userId: string;
  email: string;
  name: string;
  familyId: string;
}
