import { useState, useEffect, useMemo } from 'react';
import { LuAlertTriangle } from 'react-icons/lu';
import { PageHeader } from '../layout/PageHeader';
import { getFamilySettings } from '../../api/family-settings';
import { getFixedCosts, getFixedCostAtAge } from '../../api/fixed-costs';
import { getMonthlySummary } from '../../api/transactions';
import { formatCurrency, formatManYen } from '../../utils/format';
import type { FamilySettings, FixedCost, SimulationDataPoint, SimulationMilestone, SimulationWarning } from '../../types';

const RETIREMENT_AGE = 65;
const PENSION_ANNUAL = 3000000;

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

  const baseAge = 30;
  const yearsWorked = Math.max(age - baseAge, 0);

  if (age < 35) {
    selfIncome = baseAnnual * Math.pow(1.02, yearsWorked);
  } else if (age === 35) {
    selfIncome = baseAnnual * 1.3;
    event = { age, event: '昇進', impact: '+30%年収' };
  } else if (age < 55) {
    selfIncome = baseAnnual * 1.3 * Math.pow(1.02, age - 35);
  } else if (age === 55) {
    selfIncome = baseAnnual * 1.3 * Math.pow(1.02, 20) * 0.9;
    event = { age, event: '役職定年', impact: '-10%年収' };
  } else if (age < 60) {
    selfIncome = baseAnnual * 1.3 * Math.pow(1.02, 20) * 0.9;
  } else {
    selfIncome = baseAnnual * 0.7;
    if (age === 60) {
      event = { age, event: '再雇用', impact: '昇進前の70%' };
    }
  }

  return { income: Math.round(selfIncome + spouseAnnual + otherAnnual), event };
}

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

  const [overrideIncome, setOverrideIncome] = useState<number | null>(null);
  const [privateSchool, setPrivateSchool] = useState(true);
  const [interestRate, setInterestRate] = useState(1.5);

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

      const { income: annualIncome, event: incomeEvent } = calcAnnualIncome(
        age, baseMonthlyIncome, settings.income.spouseMonthlyNet, settings.income.otherMonthlyIncome
      );
      if (incomeEvent) milestones.push(incomeEvent);

      const memberAges: Record<string, number> = { self: age };
      if (settings.members.spouse) memberAges.spouse = year - settings.members.spouse.birthYear;
      if (settings.members.child1) memberAges.child1 = year - settings.members.child1.birthYear;
      if (settings.members.child2) memberAges.child2 = year - settings.members.child2.birthYear;

      const annualFixed = getFixedCostAtAge(fixedCosts, memberAges) * 12;

      let annualEducation = 0;
      for (const [key, child] of Object.entries(settings.members)) {
        if (!key.startsWith('child') || !child) continue;
        const childAge = year - (child as typeof settings.members.child1)!.birthYear;
        const { cost, event } = calcEducationCost(childAge);
        annualEducation += privateSchool ? cost : Math.round(cost * 0.5);
        if (event) {
          milestones.push({
            age,
            event: `${(child as typeof settings.members.child1)!.name || key} ${event}`,
            impact: `教育費 ${formatManYen(cost)}/年`,
          });
        }
      }

      const annualVariable = Math.round(monthlyVariable * 12 * Math.pow(INFLATION, yearsFromNow));
      const totalExpense = annualFixed + annualVariable + annualEducation;
      const balance = annualIncome - totalExpense;
      savings += balance;

      dataPoints.push({ age, year, annualIncome, annualExpense: totalExpense, balance, cumulativeSavings: savings });

      if (savings < 0 && (dataPoints.length < 2 || dataPoints[dataPoints.length - 2].cumulativeSavings >= 0)) {
        warnings.push({
          age,
          message: `${age}歳時点で貯蓄がマイナスに転じます。事前に${formatManYen(Math.abs(balance) * 3)}の積立を推奨します`,
        });
      }
    }

    return { dataPoints, milestones, warnings, finalSavings: savings };
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
  const selfAge = new Date().getFullYear() - settings.members.self.birthYear;

  // 65歳以降の取り崩し計算
  const retirementBalance = finalSavings > 0
    ? `老後も${formatManYen(Math.round(finalSavings / 30))}/年 取り崩しで95歳まで安心`
    : '老後の資金が不足する可能性があります';

  return (
    <div className="px-4 pb-4">
      <PageHeader title="将来シミュレーター" />

      {/* サマリーカード — ネイビー背景、白テキスト */}
      <div className="p-6 mb-4 text-center"
        style={{ backgroundColor: '#1E3A5F', borderRadius: '16px' }}>
        <p className="text-xs mb-2" style={{ color: '#D6E4F0' }}>65歳時点の貯蓄</p>
        <p className="font-bold mb-2"
          style={{
            fontSize: '36px',
            lineHeight: 1.1,
            color: finalSavings < 0 ? '#FCA5A5' : '#FFFFFF',
          }}>
          {formatManYen(finalSavings)}
        </p>
        <p className="text-xs" style={{ color: '#D6E4F0' }}>{retirementBalance}</p>
      </div>

      {/* 貯蓄推移グラフ */}
      <div className="card mb-4">
        <h3 className="text-sm font-bold mb-3" style={{ color: '#1E3A5F' }}>貯蓄推移</h3>
        <div className="relative h-52 flex items-end gap-px">
          {/* ゼロライン（マイナスがある場合） */}
          {minSavings < 0 && (
            <div
              className="absolute left-0 right-0 border-t border-dashed border-slate-300"
              style={{
                bottom: `${((0 - minSavings) / (maxSavings - minSavings)) * 100}%`,
              }}
            />
          )}

          {dataPoints.map((p, i) => {
            const range = maxSavings - minSavings || 1;
            const normalizedHeight = ((p.cumulativeSavings - minSavings) / range) * 100;
            const heightPercent = Math.max(normalizedHeight, 2);
            const isNegative = p.cumulativeSavings < 0;
            const isCurrent = p.age === selfAge;

            // マイルストーンマーカー
            const milestone = milestones.find(m => m.age === p.age);

            return (
              <div key={i} className="flex-1 flex flex-col items-center justify-end relative"
                title={`${p.age}歳: ${formatManYen(p.cumulativeSavings)}`}>

                {/* マイルストーンマーカー */}
                {milestone && (
                  <div className="absolute -top-1 z-10">
                    <div className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: milestone.event === '昇進' ? '#059669' : '#E67E22' }} />
                  </div>
                )}

                {/* 現在位置マーカー */}
                {isCurrent && (
                  <div className="absolute top-0 bottom-0 w-px border-l border-dashed"
                    style={{ borderColor: '#2E86C1' }}>
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-medium whitespace-nowrap"
                      style={{ color: '#2E86C1' }}>
                      現在
                    </span>
                  </div>
                )}

                {/* バー */}
                <div
                  className="w-full transition-all"
                  style={{
                    height: `${heightPercent}%`,
                    minHeight: '2px',
                    backgroundColor: isNegative ? '#FCA5A5' : '#2E86C1',
                    borderRadius: '2px 2px 0 0',
                  }}
                />

                {/* 赤字ゾーンの塗りつぶし */}
                {isNegative && (
                  <div
                    className="absolute bottom-0 left-0 right-0"
                    style={{
                      height: `${Math.abs((p.cumulativeSavings / minSavings) * ((0 - minSavings) / range) * 100)}%`,
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    }}
                  />
                )}

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

      {/* スライダーパネル — 試算変更 */}
      <div className="card mb-4 space-y-5">
        <h3 className="text-sm font-bold" style={{ color: '#1E3A5F' }}>試算を変更</h3>

        {/* 年収スライダー */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-slate-600">年収</label>
            <span className="text-sm font-bold" style={{ color: '#1E3A5F' }}>
              {formatManYen((overrideIncome || settings.income.selfMonthlyNet) * 12)}
            </span>
          </div>
          <input
            type="range"
            min={200000}
            max={1500000}
            step={10000}
            value={overrideIncome || settings.income.selfMonthlyNet}
            onChange={e => setOverrideIncome(parseInt(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #2E86C1 ${((overrideIncome || settings.income.selfMonthlyNet) - 200000) / 13000}%, #E5E7EB ${((overrideIncome || settings.income.selfMonthlyNet) - 200000) / 13000}%)`,
            }}
          />
        </div>

        {/* 私立中学トグル */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-slate-600">私立中学</label>
          <button
            onClick={() => setPrivateSchool(!privateSchool)}
            className="relative w-12 h-7 rounded-full transition-colors duration-200"
            style={{ backgroundColor: privateSchool ? '#2E86C1' : '#D1D5DB' }}
          >
            <div
              className="absolute top-0.5 w-6 h-6 bg-white rounded-full transition-transform duration-200"
              style={{
                transform: privateSchool ? 'translateX(22px)' : 'translateX(2px)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}
            />
          </button>
        </div>

        {/* 変動金利スライダー */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-slate-600">変動金利</label>
            <span className="text-sm font-bold" style={{ color: '#1E3A5F' }}>
              {interestRate.toFixed(1)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={30}
            step={1}
            value={interestRate * 10}
            onChange={e => setInterestRate(parseInt(e.target.value) / 10)}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #2E86C1 ${(interestRate / 3) * 100}%, #E5E7EB ${(interestRate / 3) * 100}%)`,
            }}
          />
        </div>
      </div>

      {/* 警告カード */}
      {warnings.map((w, i) => (
        <div
          key={i}
          className="mb-4 p-4 flex items-start gap-3"
          style={{ backgroundColor: '#FDEBD0', borderRadius: '16px' }}
        >
          <LuAlertTriangle size={20} color="#E67E22" className="shrink-0" />
          <div>
            <p className="text-sm font-bold" style={{ color: '#E67E22' }}>{w.age}歳</p>
            <p className="text-xs mt-0.5" style={{ color: '#92400E' }}>{w.message}</p>
          </div>
        </div>
      ))}

      {/* マイルストーン年表 */}
      <div className="card mb-4">
        <h3 className="text-sm font-bold mb-3" style={{ color: '#1E3A5F' }}>ライフイベント年表</h3>
        <div className="space-y-0 max-h-64 overflow-y-auto">
          {milestones.map((m, i) => (
            <div key={i} className="flex items-center text-xs py-2.5 border-b border-slate-50 last:border-0">
              <span className="w-12 font-medium shrink-0" style={{ color: '#2E86C1' }}>{m.age}歳</span>
              <span className="flex-1 font-medium" style={{ color: '#1E3A5F' }}>{m.event}</span>
              <span className="text-slate-400 shrink-0">{m.impact}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
