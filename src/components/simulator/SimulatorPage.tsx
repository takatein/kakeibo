import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { getFamilySettings } from '../../api/family-settings';
import { getFixedCosts } from '../../api/fixed-costs';
import { getMonthlySummary } from '../../api/transactions';
import { formatCurrency, formatManYen } from '../../utils/format';
import type { FamilySettings, FixedCost } from '../../types';

interface YearProjection {
  year: number;
  age: number;
  income: number;
  expense: number;
  balance: number;
  savings: number;
  events: string[];
}

/** 教育費の概算（年間） */
function estimateEducationCost(
  childAge: number,
  plan: 'public' | 'private' | 'mixed'
): number {
  // 概算値（万円/年）
  const publicCosts: Record<string, number> = {
    nursery: 30, kindergarten: 25, elementary: 35,
    middle: 50, high: 50, university: 120,
  };
  const privateCosts: Record<string, number> = {
    nursery: 50, kindergarten: 50, elementary: 100,
    middle: 140, high: 100, university: 170,
  };

  let stage = '';
  if (childAge < 3) stage = 'nursery';
  else if (childAge < 6) stage = 'kindergarten';
  else if (childAge < 12) stage = 'elementary';
  else if (childAge < 15) stage = 'middle';
  else if (childAge < 18) stage = 'high';
  else if (childAge < 22) stage = 'university';
  else return 0;

  if (plan === 'public') return (publicCosts[stage] || 0) * 10000;
  if (plan === 'private') return (privateCosts[stage] || 0) * 10000;
  // mixed: 中学から私立
  if (['middle', 'high', 'university'].includes(stage)) {
    return (privateCosts[stage] || 0) * 10000;
  }
  return (publicCosts[stage] || 0) * 10000;
}

export function SimulatorPage() {
  const [settings, setSettings] = useState<FamilySettings | null>(null);
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
  const [currentMonthlyExpense, setCurrentMonthlyExpense] = useState(0);
  const [initialSavings, setInitialSavings] = useState(5000000);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fs, fc, summary] = await Promise.all([
        getFamilySettings(),
        getFixedCosts(),
        getMonthlySummary(),
      ]);
      setSettings(fs);
      setFixedCosts(fc);
      setCurrentMonthlyExpense(summary.totalExpense);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const projections = useMemo<YearProjection[]>(() => {
    if (!settings) return [];

    const currentYear = new Date().getFullYear();
    const currentAge = currentYear - settings.husbandBirthYear;
    const targetAge = settings.retirementAge;
    const years: YearProjection[] = [];
    let savings = initialSavings;

    const monthlyFixed = fixedCosts
      .filter(c => c.isActive)
      .reduce((sum, c) => sum + c.amount, 0);

    const monthlyVariable = Math.max(currentMonthlyExpense - monthlyFixed, 0) || 150000;

    for (let age = currentAge; age <= targetAge; age++) {
      const year = currentYear + (age - currentAge);
      const events: string[] = [];

      // 収入（定年前）
      const annualIncome = age < targetAge
        ? settings.monthlyIncome * 12 + settings.bonusPerYear
        : 0;

      // 固定費（年齢トリガーを考慮）
      let annualFixed = 0;
      for (const fc of fixedCosts) {
        if (!fc.isActive) continue;
        if (fc.startAge && age < fc.startAge) continue;
        if (fc.endAge && age > fc.endAge) {
          if (age === fc.endAge + 1) events.push(`${fc.name} 終了`);
          continue;
        }
        annualFixed += fc.amount * 12;
      }

      // 教育費
      let annualEducation = 0;
      for (const child of settings.children) {
        const childAge = year - child.birthYear;
        const edu = estimateEducationCost(childAge, child.educationPlan);
        if (edu > 0) {
          annualEducation += edu;
          if (childAge === 6) events.push(`${child.name} 小学校入学`);
          if (childAge === 12) events.push(`${child.name} 中学校入学`);
          if (childAge === 15) events.push(`${child.name} 高校入学`);
          if (childAge === 18) events.push(`${child.name} 大学入学`);
        }
      }

      const annualVariable = monthlyVariable * 12;
      const totalExpense = annualFixed + annualVariable + annualEducation;
      const balance = annualIncome - totalExpense;
      savings += balance;

      years.push({
        year,
        age,
        income: annualIncome,
        expense: totalExpense,
        balance,
        savings,
        events,
      });
    }

    return years;
  }, [settings, fixedCosts, currentMonthlyExpense, initialSavings]);

  if (isLoading) {
    return <div className="text-center py-12 text-slate-400">読み込み中...</div>;
  }

  if (!settings) {
    return (
      <div className="px-4 pb-4">
        <PageHeader title="将来シミュレーター" />
        <div className="card text-center py-12">
          <p className="text-slate-400 text-sm">
            先にナレッジ管理で家族設定を保存してください
          </p>
        </div>
      </div>
    );
  }

  const minSavings = Math.min(...projections.map(p => p.savings));
  const maxSavings = Math.max(...projections.map(p => p.savings));

  return (
    <div className="px-4 pb-4">
      <PageHeader title="将来シミュレーター" subtitle="65歳までの貯蓄推移" />

      {/* 初期貯蓄 */}
      <div className="card mb-4">
        <label className="text-xs text-slate-500 block mb-1">現在の貯蓄額</label>
        <input
          type="number"
          value={initialSavings}
          onChange={e => setInitialSavings(parseInt(e.target.value) || 0)}
          className="input-field text-lg font-bold"
          step={1000000}
        />
      </div>

      {/* 簡易グラフ */}
      <div className="card mb-4">
        <h3 className="text-sm font-bold text-slate-700 mb-3">貯蓄推移</h3>
        <div className="h-48 flex items-end gap-0.5">
          {projections.map((p, i) => {
            const range = maxSavings - minSavings || 1;
            const normalizedHeight = ((p.savings - minSavings) / range) * 100;
            const heightPercent = Math.max(normalizedHeight, 2);
            const isNegative = p.savings < 0;

            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center justify-end"
                title={`${p.age}歳: ${formatManYen(p.savings)}`}
              >
                <div
                  className={`w-full rounded-t transition-all ${
                    isNegative ? 'bg-red-400' : p.events.length > 0 ? 'bg-amber-400' : 'bg-primary-400'
                  }`}
                  style={{ height: `${heightPercent}%`, minHeight: '2px' }}
                />
                {p.age % 5 === 0 && (
                  <span className="text-[8px] text-slate-400 mt-1">{p.age}</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-slate-400">
          <span>{projections[0]?.age}歳</span>
          <span>{projections[projections.length - 1]?.age}歳</span>
        </div>
      </div>

      {/* イベント付きテーブル */}
      <div className="card">
        <h3 className="text-sm font-bold text-slate-700 mb-3">年表</h3>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {projections
            .filter(p => p.events.length > 0 || p.age % 5 === 0)
            .map((p) => (
              <div
                key={p.year}
                className={`flex items-center text-xs py-1.5 border-b border-slate-50 ${
                  p.savings < 0 ? 'text-red-600' : ''
                }`}
              >
                <span className="w-12 text-slate-500 shrink-0">{p.age}歳</span>
                <span className="flex-1 text-slate-600 truncate">
                  {p.events.join(', ') || '—'}
                </span>
                <span className={`font-medium shrink-0 ${p.savings < 0 ? 'text-red-600' : 'text-slate-700'}`}>
                  {formatManYen(p.savings)}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* 警告 */}
      {minSavings < 0 && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-bold text-red-700">注意</p>
          <p className="text-xs text-red-600 mt-1">
            シミュレーション期間中に貯蓄がマイナスになるタイミングがあります。
            固定費の見直しや収入増加の検討をおすすめします。
          </p>
        </div>
      )}
    </div>
  );
}
