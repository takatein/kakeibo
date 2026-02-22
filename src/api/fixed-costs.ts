import type { FixedCost } from '../types';
import { generateId } from '../utils/id';

const STORAGE_KEY = 'kakeibo_fixed_costs';

// ========================================
// ローカルストレージベースの仮実装
// AWS接続後にAPI呼び出しに差し替え
// ========================================

function getStoredFixedCosts(): FixedCost[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveFixedCosts(costs: FixedCost[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(costs));
}

/** 固定費一覧を取得 */
export async function getFixedCosts(): Promise<FixedCost[]> {
  return getStoredFixedCosts().sort((a, b) => a.category.localeCompare(b.category));
}

/** 固定費を追加 */
export async function addFixedCost(
  cost: Omit<FixedCost, 'id' | 'createdAt' | 'updatedAt'>
): Promise<FixedCost> {
  const now = new Date().toISOString();
  const newCost: FixedCost = {
    ...cost,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };

  const costs = getStoredFixedCosts();
  costs.push(newCost);
  saveFixedCosts(costs);
  return newCost;
}

/** 固定費を更新 */
export async function updateFixedCost(
  id: string,
  updates: Partial<FixedCost>
): Promise<FixedCost> {
  const costs = getStoredFixedCosts();
  const idx = costs.findIndex(c => c.id === id);
  if (idx === -1) throw new Error(`Fixed cost not found: ${id}`);

  costs[idx] = {
    ...costs[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  saveFixedCosts(costs);
  return costs[idx];
}

/** 固定費を削除 */
export async function deleteFixedCost(id: string): Promise<void> {
  const costs = getStoredFixedCosts().filter(c => c.id !== id);
  saveFixedCosts(costs);
}

/** 今月の固定費合計を算出 */
export async function getMonthlyFixedTotal(): Promise<number> {
  const costs = getStoredFixedCosts().filter(c => c.isActive);
  return costs.reduce((sum, c) => sum + c.amount, 0);
}
