import type { PatternKnowledge, ContextKnowledge, Transaction } from '../types';
import { detectPatterns, extractContextRules } from '../utils/pattern-analyzer';

const PATTERNS_KEY = 'kakeibo_patterns';
const CONTEXT_KEY = 'kakeibo_context_rules';
const TRANSACTIONS_KEY = 'kakeibo_transactions';

// ========================================
// ローカルストレージベースの仮実装
// AWS接続後にAPI呼び出しに差し替え（設計書 §5 準拠）
// ========================================

function getStoredPatterns(): PatternKnowledge[] {
  const stored = localStorage.getItem(PATTERNS_KEY);
  return stored ? JSON.parse(stored) : [];
}

function savePatterns(patterns: PatternKnowledge[]): void {
  localStorage.setItem(PATTERNS_KEY, JSON.stringify(patterns));
}

function getStoredContext(): ContextKnowledge {
  const stored = localStorage.getItem(CONTEXT_KEY);
  return stored ? JSON.parse(stored) : { shopToCategory: {}, keywordToCategory: {} };
}

function saveContext(context: ContextKnowledge): void {
  localStorage.setItem(CONTEXT_KEY, JSON.stringify(context));
}

/** パターン一覧を取得 */
export async function getPatterns(): Promise<PatternKnowledge[]> {
  return getStoredPatterns();
}

/** 承認済みパターンを取得 */
export async function getApprovedPatterns(): Promise<PatternKnowledge[]> {
  return getStoredPatterns().filter(p => p.status === 'approved');
}

/** 承認待ちパターンを取得 */
export async function getPendingPatterns(): Promise<PatternKnowledge[]> {
  return getStoredPatterns().filter(p => p.status === 'pending');
}

/** パターンを承認 */
export async function approvePattern(patternId: string): Promise<void> {
  const patterns = getStoredPatterns();
  const idx = patterns.findIndex(p => p.patternId === patternId);
  if (idx === -1) return;

  patterns[idx].status = 'approved';
  patterns[idx].approvedAt = new Date().toISOString();
  savePatterns(patterns);

  // コンテキストルールも更新
  await rebuildContextRules();
}

/** パターンを却下 */
export async function rejectPattern(patternId: string): Promise<void> {
  const patterns = getStoredPatterns();
  const idx = patterns.findIndex(p => p.patternId === patternId);
  if (idx === -1) return;

  patterns[idx].status = 'rejected';
  savePatterns(patterns);
}

/** パターンを削除 */
export async function deletePattern(patternId: string): Promise<void> {
  const patterns = getStoredPatterns().filter(p => p.patternId !== patternId);
  savePatterns(patterns);
}

/** コンテキストルールを取得 */
export async function getContextRules(): Promise<ContextKnowledge> {
  return getStoredContext();
}

/** 取引履歴からパターン分析を実行（設計書 §5-2 日次バッチ相当） */
export async function runPatternAnalysis(): Promise<{
  newPatterns: number;
  totalPatterns: number;
}> {
  // 取引データを取得
  const txnStr = localStorage.getItem(TRANSACTIONS_KEY);
  const transactions: Transaction[] = txnStr ? JSON.parse(txnStr) : [];

  if (transactions.length < 3) {
    return { newPatterns: 0, totalPatterns: getStoredPatterns().length };
  }

  // パターン検出
  const detected = detectPatterns(transactions);
  const existing = getStoredPatterns();

  // 既存パターンと重複チェック（同じカテゴリ+説明のものはスキップ）
  const existingKeys = new Set(existing.map(p => `${p.category}_${p.description}`));
  const newPatterns = detected.filter(p => !existingKeys.has(`${p.category}_${p.description}`));

  if (newPatterns.length > 0) {
    savePatterns([...existing, ...newPatterns]);
  }

  // コンテキストルール更新
  const context = extractContextRules(transactions);
  const existingContext = getStoredContext();
  saveContext({
    shopToCategory: { ...existingContext.shopToCategory, ...context.shopToCategory },
    keywordToCategory: { ...existingContext.keywordToCategory, ...context.keywordToCategory },
  });

  return {
    newPatterns: newPatterns.length,
    totalPatterns: existing.length + newPatterns.length,
  };
}

/** コンテキストルールを取引履歴から再構築 */
async function rebuildContextRules(): Promise<void> {
  const txnStr = localStorage.getItem(TRANSACTIONS_KEY);
  const transactions: Transaction[] = txnStr ? JSON.parse(txnStr) : [];
  const context = extractContextRules(transactions);
  saveContext(context);
}
