import type { FamilySettings } from '../types';

const STORAGE_KEY = 'kakeibo_family_settings';

const DEFAULT_SETTINGS: FamilySettings = {
  userId: 'demo-user',
  husbandName: '',
  wifeName: '',
  husbandBirthYear: 1985,
  wifeBirthYear: 1987,
  children: [],
  monthlyIncome: 500000,
  bonusPerYear: 1000000,
  retirementAge: 65,
};

/** 家族設定を取得 */
export async function getFamilySettings(): Promise<FamilySettings> {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
}

/** 家族設定を更新 */
export async function updateFamilySettings(
  updates: Partial<FamilySettings>
): Promise<FamilySettings> {
  const current = await getFamilySettings();
  const updated = { ...current, ...updates };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
