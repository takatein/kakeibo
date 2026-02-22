import type { FixedCost, AgeTrigger } from '../types';
import { generateId } from '../utils/id';

const STORAGE_KEY = 'kakeibo_fixed_costs';
const FAMILY_ID = 'demo-family';

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
  // TODO: return apiClient.get<FixedCost[]>('/fixed-costs');
  return getStoredFixedCosts().sort((a, b) => a.category.localeCompare(b.category));
}

/** 固定費を追加（設計書 §4-2 AgeTrigger対応） */
export async function addFixedCost(
  cost: Omit<FixedCost, 'PK' | 'SK' | 'costId' | 'createdAt' | 'updatedAt'>
): Promise<FixedCost> {
  // TODO: return apiClient.post<FixedCost>('/fixed-costs', cost);
  const now = new Date().toISOString();
  const costId = `fc-${generateId()}`;
  const newCost: FixedCost = {
    ...cost,
    PK: `family_${FAMILY_ID}`,
    SK: `fixed#${costId}`,
    costId,
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
  costId: string,
  updates: Partial<FixedCost>
): Promise<FixedCost> {
  // TODO: return apiClient.put<FixedCost>(`/fixed-costs/${costId}`, updates);
  const costs = getStoredFixedCosts();
  const idx = costs.findIndex(c => c.costId === costId);
  if (idx === -1) throw new Error(`Fixed cost not found: ${costId}`);

  costs[idx] = {
    ...costs[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  saveFixedCosts(costs);
  return costs[idx];
}

/** 固定費を削除 */
export async function deleteFixedCost(costId: string): Promise<void> {
  // TODO: return apiClient.delete(`/fixed-costs/${costId}`);
  const costs = getStoredFixedCosts().filter(c => c.costId !== costId);
  saveFixedCosts(costs);
}

/** 今月の固定費合計を算出 */
export async function getMonthlyFixedTotal(): Promise<number> {
  const costs = getStoredFixedCosts().filter(c => c.isActive);
  return costs.reduce((sum, c) => sum + c.amount, 0);
}

/** 特定年齢時の固定費合計を算出（年齢トリガー考慮） */
export function getFixedCostAtAge(
  costs: FixedCost[],
  memberAges: Record<string, number>
): number {
  let total = 0;
  for (const cost of costs) {
    if (!cost.isActive) continue;
    let amount = cost.amount;
    let active = true;

    if (cost.ageTriggers) {
      for (const trigger of cost.ageTriggers) {
        const age = memberAges[trigger.targetMember];
        if (age !== undefined && age >= trigger.triggerAge) {
          if (trigger.action === 'deactivate') {
            active = false;
            break;
          } else if (trigger.action === 'update_amount' && trigger.newAmount !== undefined) {
            amount = trigger.newAmount;
          }
        }
      }
    }

    if (active) total += amount;
  }
  return total;
}
