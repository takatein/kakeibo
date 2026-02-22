// ========================================
// Kakeibo AI - Type Definitions
// 詳細設計書 v1.0 準拠
// ========================================

/** 入力方式 */
export type InputMethod = 'camera' | 'text' | 'voice' | 'manual' | 'auto';

/** 入力者 */
export type InputBy = 'primary' | 'secondary';

/** カテゴリ（設計書 §4-1 / §8-3 準拠） */
export type Category =
  | 'food_home'        // 食費（自炊）
  | 'food_restaurant'  // 外食（ファミレス）
  | 'food_premium'     // 外食（高級）
  | 'daily_goods'      // 日用品
  | 'children'         // 子供関連
  | 'education'        // 教育費
  | 'outing'           // 週末外出
  | 'travel'           // 旅行
  | 'medical'          // 医療費
  | 'utility'          // 光熱費・通信
  | 'insurance'        // 保険
  | 'loan'             // ローン
  | 'car'              // 車関連
  | 'hobby'            // 趣味（副業費）
  | 'other';           // その他

/** カテゴリ表示名マッピング */
export const CATEGORY_LABELS: Record<Category, string> = {
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

/** カテゴリ色マッピング */
export const CATEGORY_COLORS: Record<Category, string> = {
  food_home: '#22c55e',
  food_restaurant: '#f97316',
  food_premium: '#dc2626',
  daily_goods: '#06b6d4',
  children: '#d946ef',
  education: '#8b5cf6',
  outing: '#eab308',
  travel: '#3b82f6',
  medical: '#14b8a6',
  utility: '#f59e0b',
  insurance: '#0ea5e9',
  loan: '#64748b',
  car: '#6366f1',
  hobby: '#a855f7',
  other: '#94a3b8',
};

// ========================================
// DynamoDB データモデル（設計書 §4 準拠）
// PK: family_{familyId} / SK: txn#{date}#{ulid}
// ========================================

/** 支出記録 */
export interface Transaction {
  PK: string;                    // "family_xxx"
  SK: string;                    // "txn#2026-02-22#01JXXXXXXXX"
  txnId: string;                 // ULID
  amount: number;
  category: Category;
  subCategory?: string;
  shopName?: string;
  memo?: string;
  date: string;                  // YYYY-MM-DD
  inputMethod: InputMethod;
  inputBy: InputBy;
  isFixed: boolean;
  receiptImageKey?: string;
  aiConfidence?: number;         // 0.0-1.0
  createdAt: string;
  updatedAt: string;
}

/** 年齢トリガー（設計書 §4-2） */
export interface AgeTrigger {
  targetMember: 'child1' | 'child2' | 'self' | 'spouse';
  triggerAge: number;
  action: 'update_amount' | 'deactivate';
  newAmount?: number;
  description: string;
}

/** 固定費マスタ（設計書 §4-2） */
export interface FixedCost {
  PK: string;                    // "family_xxx"
  SK: string;                    // "fixed#costId"
  costId: string;
  name: string;
  amount: number;
  category: Category;
  billingDay: number;            // 1-31
  isActive: boolean;
  ageTriggers?: AgeTrigger[];
  createdAt: string;
  updatedAt: string;
}

/** 家族メンバー情報 */
export interface FamilyMember {
  name: string;
  birthYear: number;
  birthMonth: number;
}

/** 家族設定（設計書 §4-3） */
export interface FamilySettings {
  PK: string;                    // "family_xxx"
  SK: 'settings';
  members: {
    self: FamilyMember;
    spouse: FamilyMember;
    child1?: FamilyMember;
    child2?: FamilyMember;
  };
  income: {
    selfMonthlyNet: number;      // 手取り月収
    spouseMonthlyNet: number;
    otherMonthlyIncome: number;  // 祖父贈与等
  };
  assets: {
    currentSavings: number;      // 現在の貯蓄額
  };
  loan: {
    monthlyPayment: number;
    remainingMonths: number;
    interestRate: number;
  };
  monthlyBudget: Partial<Record<Category, number>>;
  createdAt: string;
  updatedAt: string;
}

// ========================================
// AgentCore Memory（設計書 §5 準拠）
// ========================================

/** パターンナレッジ（設計書 §5-2） */
export interface PatternKnowledge {
  patternId: string;
  description: string;
  category: Category;
  averageAmount: number;
  frequency: 'weekly' | 'monthly';
  dayOfWeek?: string[];
  countPerWeek?: number;
  detectedAt: string;
  approvedAt?: string;
  status: 'pending' | 'approved' | 'rejected';
}

/** 文脈ナレッジ（設計書 §5-1） */
export interface ContextKnowledge {
  shopToCategory: Record<string, Category>;
  keywordToCategory: Record<string, Category>;
}

// ========================================
// API レスポンス型（設計書 §9 準拠）
// ========================================

/** 確認アイテム（POST /input レスポンス） */
export interface ConfirmItem {
  tempId: string;
  amount: number;
  category: Category;
  categoryLabel: string;
  shopName?: string;
  date: string;
  memo?: string;
  confidence: number;
  alternativeCategories: { category: Category; label: string }[];
}

/** AI入力リクエスト */
export interface InputRequest {
  type: 'text' | 'voice' | 'camera';
  content: string;
  imageKey?: string;
  timestamp: string;
}

/** AI入力レスポンス */
export interface InputResponse {
  sessionId: string;
  items: ConfirmItem[];
  needsClarification: boolean;
  clarificationMessage?: string;
}

/** 確認リクエスト */
export interface ConfirmRequest {
  sessionId: string;
  items: {
    tempId: string;
    amount: number;
    category: Category;
    shopName?: string;
    date: string;
    memo?: string;
  }[];
}

/** 月次サマリーレスポンス（設計書 §9） */
export interface MonthlySummary {
  month: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  remainingBudget: number;
  categoryBreakdown: CategoryBreakdown[];
  comparedToPrevMonth: number;
  fixedCostsTotal: number;
  variableCostsTotal: number;
}

/** カテゴリ別集計 */
export interface CategoryBreakdown {
  category: Category;
  label: string;
  amount: number;
  budgetAmount?: number;
  percentage: number;
  count: number;
}

/** ナレッジレスポンス */
export interface KnowledgeResponse {
  fixedCosts: FixedCost[];
  approvedPatterns: PatternKnowledge[];
  pendingPatterns: PatternKnowledge[];
  contextRules: ContextKnowledge;
}

/** シミュレーション結果（設計書 §8-4） */
export interface SimulationResult {
  dataPoints: SimulationDataPoint[];
  milestones: SimulationMilestone[];
  finalSavings: number;
  retirementAnnualBalance: number;
  savingsAt95: number;
  warnings: SimulationWarning[];
}

export interface SimulationDataPoint {
  age: number;
  year: number;
  annualIncome: number;
  annualExpense: number;
  balance: number;
  cumulativeSavings: number;
}

export interface SimulationMilestone {
  age: number;
  event: string;
  impact: string;
}

export interface SimulationWarning {
  age: number;
  message: string;
}

/** 認証ユーザー */
export interface AuthUser {
  userId: string;
  email: string;
  name: string;
  familyId: string;
  role: 'primary' | 'secondary';
}

// ========================================
// エラーコード（設計書 §12 準拠）
// ========================================

export const ErrorCodes = {
  AI_PARSE_FAILED: 'E1001',
  AI_CONFIDENCE_LOW: 'E1002',
  AI_TIMEOUT: 'E1003',
  INVALID_AMOUNT: 'E2001',
  INVALID_DATE: 'E2002',
  UNAUTHORIZED: 'E3001',
  TOKEN_EXPIRED: 'E3002',
  NOT_FOUND: 'E4001',
  CONFLICT: 'E4002',
} as const;
