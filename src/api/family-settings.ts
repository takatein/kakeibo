import type { FamilySettings } from '../types';

const STORAGE_KEY = 'kakeibo_family_settings';

/** デフォルト家族設定（設計書 §4-3 Kenjiさん家族） */
const DEFAULT_SETTINGS: FamilySettings = {
  PK: 'family_demo-family',
  SK: 'settings',
  members: {
    self: { name: '', birthYear: 1995, birthMonth: 1 },
    spouse: { name: '', birthYear: 1994, birthMonth: 1 },
  },
  income: {
    selfMonthlyNet: 400000,
    spouseMonthlyNet: 0,
    otherMonthlyIncome: 0,
  },
  assets: {
    currentSavings: 5000000,
  },
  loan: {
    monthlyPayment: 82000,
    remainingMonths: 300,
    interestRate: 0.5,
  },
  monthlyBudget: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/** 家族設定を取得 */
export async function getFamilySettings(): Promise<FamilySettings> {
  // TODO: return apiClient.get<FamilySettings>('/family-settings');
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
}

/** 家族設定を更新 */
export async function updateFamilySettings(
  updates: Partial<FamilySettings>
): Promise<FamilySettings> {
  // TODO: return apiClient.put<FamilySettings>('/family-settings', updates);
  const current = await getFamilySettings();
  const updated = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

/** 月収合計を取得（ヘルパー） */
export function getTotalMonthlyIncome(settings: FamilySettings): number {
  return (
    settings.income.selfMonthlyNet +
    settings.income.spouseMonthlyNet +
    settings.income.otherMonthlyIncome
  );
}
