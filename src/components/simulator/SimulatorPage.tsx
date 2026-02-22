import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { getFamilySettings, getTotalMonthlyIncome } from '../../api/family-settings';
import { getFixedCosts, getFixedCostAtAge } from '../../api/fixed-costs';
import { getMonthlySummary } from '../../api/transactions';
import { formatCurrency, formatManYen } from '../../utils/format';
import type { FamilySettings, FixedCost, SimulationDataPoint, SimulationMilestone, SimulationWarning } from '../../types';

const RETIREMENT_AGE = 65;
const PENSION_ANNUAL = 3000000; // 厚生年金(235万) + 妻基礎年金(65万) = 300万/年

/**
 * 設計書 §8-4 Simulator Agent の計算ルール準拠
 * - 35歳で昇進: 年収1,050万 → 手取り720万
 * - 以降 年功序列で年2%増加
 * - 55歳: 役職定年で10%ダウン
 * - 60〜64歳: 再雇用で昇進前給与の70%
 * - 65歳〜: 厚生年金(235万) + 妻基礎年金(65万) = 300万/年
 * - インフレ: 生活費 年1.5%増加
 */
function calcAnnualIncome(
  age: number,
  baseMonthlyIncome: number,
  spouseMonthlyIncome: number,
  otherMonthlyIncome: number,
): { income: number; event?: SimulationMilestone } {
  const baseAnnual = baseMonthlyIncome * 12;
  const spouseAnnual = spouseMonthlyIncome * 12;
  const otherAnnual = otherMonthlyIncome * 12;
  let selfIncome = baseAnnual;
  let event: SimulationMilestone | undefined;

  if (age >= RETIREMENT_AGE) {
    return { income: PENSION_ANNUAL + spouseAnnual };
  }

  // 年功序列 年2%増加（基準年齢からの差分）
  const baseAge = 30;
  const yearsWorked = Math.max(age - baseAge, 0);

  if (age < 35) {
    selfIncome = baseAnnual * Math.pow(1.02, yearsWorked);
  } else if (age === 35) {
    selfIncome = baseAnnual * 1.3; // 昇進ボーナス
    event = { age, event: '昇進', impact: '+30%年収' };
  } else if (age < 55) {
    selfIncome = baseAnnual * 1.3 * Math.pow(1.02, age - 35);
  } else if (age === 55) {
    selfIncome = baseAnnual * 1.3 * Math.pow(1.02, 20) * 0.9;
    event = { age, event: '役職定年', impact: '-10%年収' };
  } else if (age < 60) {
    selfIncome = baseAnnual * 1.3 * Math.pow(1.02, 20) * 0.9;
  } else {
    // 60-64: 再雇用（昇進前給与の70%）
    selfIncome = baseAnnual * 0.7;
    if (age === 60) {
      event = { age, event: '再雇用', impact: '昇進前の70%' };
    }
  }

  return { income: Math.round(selfIncome + spouseAnnual + otherAnnual), event };
}

/**
 * 設計書 §8-4 教育費
 * - 私立中学: 120万/年/人
 * - 高校塾: 100万/年/人
 * - 国立大学+一人暮らし: 175万/年/人
 */
function calcEducationCost(childAge: number): { cost: number; event?: string } {
  if (childAge < 3) return { cost: 300000 };
  if (childAge < 6) return { cost: 250000, event: childAge === 3 ? '幼稚園入園' : undefined };
  if (childAge < 12) return { cost: 350000, event: childAge === 6 ? '小学校入学' : undefined };
  if (childAge < 15) return { cost: 1200000, event: childAge === 12 ? '私立中学入学' : undefined };
  if (childAge < 18) return { cost: 1000000, event: childAge === 15 ? '高校入学' : undefined };
  if (childAge < 22) return { cost: 1750000, event: childAge === 18 ? '大学入学' : undefined };
  return { cost: 0, event: childAge === 22 ? '卒業' : undefined };
}

export function SimulatorPage() {
  const [settings, setSettings] = useState<FamilySettings | null>(null);
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
  const [currentMonthlyVariable, setCurrentMonthlyVariable] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // 設計書 §10-3: スライダーパネル
  const [overrideIncome, setOverrideIncome] = useState<number | null>(null);
  const [privateSchool, setPrivateSchool] = useState(true);
  const [interestRate, setInterestRate] = useState<number | null>(null);

  useEffect(() => { loadData(); }, []);

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
      setCurrentMonthlyVariable(summary.variableCostsTotal || 0);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const { dataPoints, milestones, warnings, finalSavings } = useMemo(() => {
    if (!settings) return { dataPoints: [], milestones: [], warnings: [], finalSavings: 0 };

    const currentYear = new Date().getFullYear();
    const selfAge = currentYear - settings.members.self.birthYear;
    const dataPoints: SimulationDataPoint[] = [];
    const milestones: SimulationMilestone[] = [];
    const warnings: SimulationWarning[] = [];

    let savings = settings.assets.currentSavings;
    const baseMonthlyIncome = overrideIncome || settings.income.selfMonthlyNet;
    const monthlyVariable = currentMonthlyVariable || 150000;
    const INFLATION = 1.015;

    for (let age = selfAge; age <= RETIREMENT_AGE; age++) {
      const year = currentYear + (age - selfAge);
      const yearsFromNow = age - selfAge;

      // 収入
      const { income: annualIncome, event: incomeEvent } = calcAnnualIncome(
        age, baseMonthlyIncome, settings.income.spouseMonthlyNet, settings.income.otherMonthlyIncome
      );
      if (incomeEvent) milestones.push(incomeEvent);

      // 固定費（年齢トリガー考慮）
      const memberAges: Record<string, number> = { self: age };
      if (settings.members.spouse) memberAges.spouse = year - settings.members.spouse.birthYear;
      if (settings.members.child1) memberAges.child1 = year - settings.members.child1.birthYear;
      if (settings.members.child2) memberAges.child2 = year - settings.members.child2.birthYear;

      const annualFixed = getFixedCostAtAge(fixedCosts, memberAges) * 12;

      // 教育費
      let annualEducation = 0;
      for (const [key, child] of Object.entries(settings.members)) {
        if (!key.startsWith('child') || !child) continue;
        const childAge = year - (child as typeof settings.members.child1)!.birthYear;
        const { cost, event } = calcEducationCost(childAge);
        annualEducation += privateSchool ? cost : Math.round(cost * 0.5); // 公立なら半額
        if (event) {
          milestones.push({
            age,
            event: `${(child as typeof settings.members.child1)!.name || key} ${event}`,
            impact: `教育費 ${formatManYen(cost)}/年`,
          });
        }
      }

      // 変動費（インフレ考慮 §8-4）
      const annualVariable = Math.round(monthlyVariable * 12 * Math.pow(INFLATION, yearsFromNow));

      const totalExpense = annualFixed + annualVariable + annualEducation;
      const balance = annualIncome - totalExpense;
      savings += balance;

      dataPoints.push({
        age,
        year,
        annualIncome,
        annualExpense: totalExpense,
        balance,
        cumulativeSavings: savings,
      });

      // 警告
      if (savings < 0 && (dataPoints.length < 2 || dataPoints[dataPoints.length - 2].cumulativeSavings >= 0)) {
        warnings.push({
          age,
          message: `${age}歳時点で貯蓄がマイナスに転じます。事前に${formatManYen(Math.abs(balance) * 3)}の積立を推奨します`,
        });
      }
    }

    return {
      dataPoints,
      milestones,
      warnings,
      finalSavings: savings,
    };
  }, [settings, fixedCosts, currentMonthlyVariable, overrideIncome, privateSchool, interestRate]);

  if (isLoading) {
    return <div className="text-center py-12 text-slate-400">読み込み中...</div>;
  }

  if (!settings) {
    return (
      <div className="px-4 pb-4">
        <PageHeader title="将来シミュレーター" />
        <div className="card text-center py-12">
          <p className="text-slate-400 text-sm">先にナレッジ管理で家族設定を保存してください</p>
        </div>
      </div>
    );
  }

  const minSavings = Math.min(...dataPoints.map(p => p.cumulativeSavings));
  const maxSavings = Math.max(...dataPoints.map(p => p.cumulativeSavings));

  return (
    <div className="px-4 pb-4">
      <PageHeader title="将来シミュレーター" subtitle="65歳までの貯蓄推移" />

      {/* 設計書 §10-3: 65歳時点の貯蓄 */}
      <div className="card mb-4 text-center">
        <p className="text-xs text-slate-500">65歳時点</p>
        <p className={`text-3xl font-bold ${finalSavings < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
          {formatManYen(finalSavings)}
        </p>
      </div>

      {/* 設計書 §10-3: 折れ線グラフ（簡易棒グラフ） */}
      <div className="card mb-4">
        <h3 className="text-sm font-bold text-slate-700 mb-3">貯蓄推移</h3>
        <div className="h-48 flex items-end gap-0.5">
          {dataPoints.map((p, i) => {
            const range = maxSavings - minSavings || 1;
            const normalizedHeight = ((p.cumulativeSavings - minSavings) / range) * 100;
            const heightPercent = Math.max(normalizedHeight, 2);
            const isNegative = p.cumulativeSavings < 0;

            return (
              <div key={i} className="flex-1 flex flex-col items-center justify-end"
                title={`${p.age}歳: ${formatManYen(p.cumulativeSavings)}`}>
                <div
                  className={`w-full rounded-t transition-all ${
                    isNegative ? 'bg-red-400' : 'bg-primary-400'
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
          <span>{dataPoints[0]?.age}歳</span>
          <span>{dataPoints[dataPoints.length - 1]?.age}歳</span>
        </div>
      </div>

      {/* 設計書 §10-3: スライダーパネル */}
      <div className="card mb-4 space-y-4">
        <h3 className="text-sm font-bold text-slate-700">「もし〜なら」試算</h3>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-slate-500">月収（手取り）</label>
            <span className="text-xs font-medium">{formatCurrency(overrideIncome || settings.income.selfMonthlyNet)}</span>
          </div>
          <input
            type="range"
            min={200000}
            max={1500000}
            step={10000}
            value={overrideIncome || settings.income.selfMonthlyNet}
            onChange={e => setOverrideIncome(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">私立中学</label>
          <button
            onClick={() => setPrivateSchool(!privateSchool)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              privateSchool ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {privateSchool ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* マイルストーン年表 */}
      <div className="card mb-4">
        <h3 className="text-sm font-bold text-slate-700 mb-3">ライフイベント年表</h3>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {milestones.map((m, i) => (
            <div key={i} className="flex items-center text-xs py-1.5 border-b border-slate-50">
              <span className="w-12 text-slate-500 shrink-0">{m.age}歳</span>
              <span className="flex-1 text-slate-700 font-medium">{m.event}</span>
              <span className="text-slate-400 shrink-0">{m.impact}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 設計書 §8-4: 警告 */}
      {warnings.map((w, i) => (
        <div key={i} className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-bold text-red-700">{w.age}歳 注意</p>
          <p className="text-xs text-red-600 mt-1">{w.message}</p>
        </div>
      ))}
    </div>
  );
}
