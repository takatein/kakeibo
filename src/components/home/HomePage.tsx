import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../layout/PageHeader';
import { BudgetCard } from './BudgetCard';
import { CategoryChart } from './CategoryChart';
import { RecentTransactions } from './RecentTransactions';
import { getMonthlySummary } from '../../api/transactions';
import { getFixedCosts } from '../../api/fixed-costs';
import { getFamilySettings } from '../../api/family-settings';
import { formatMonthJa, formatMonth } from '../../utils/format';
import type { MonthlySummary, FamilySettings } from '../../types';

export function HomePage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [settings, setSettings] = useState<FamilySettings | null>(null);
  const [currentMonth, setCurrentMonth] = useState(formatMonth(new Date()));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [currentMonth]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [s, fs, _fc] = await Promise.all([
        getMonthlySummary(currentMonth),
        getFamilySettings(),
        getFixedCosts(),
      ]);
      setSummary(s);
      setSettings(fs);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateMonth = (direction: -1 | 1) => {
    const [y, m] = currentMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + direction, 1);
    setCurrentMonth(formatMonth(d));
  };

  if (isLoading && !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">読み込み中...</div>
      </div>
    );
  }

  const monthlyBudget = settings?.monthlyIncome || 0;
  const remaining = monthlyBudget - (summary?.totalExpense || 0);

  return (
    <div className="px-4 pb-4">
      <PageHeader
        title="Kakeibo AI"
        subtitle="概算家計管理"
        rightAction={
          <button
            onClick={() => navigate('/input')}
            className="bg-primary-600 text-white w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-lg"
          >
            +
          </button>
        }
      />

      {/* 月切り替え */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <button
          onClick={() => navigateMonth(-1)}
          className="text-slate-400 p-2"
        >
          ←
        </button>
        <span className="text-lg font-bold">{formatMonthJa(currentMonth)}</span>
        <button
          onClick={() => navigateMonth(1)}
          className="text-slate-400 p-2"
        >
          →
        </button>
      </div>

      {/* 予算カード */}
      <BudgetCard
        monthlyBudget={monthlyBudget}
        totalExpense={summary?.totalExpense || 0}
        fixedExpense={summary?.fixedExpense || 0}
        variableExpense={summary?.variableExpense || 0}
        remaining={remaining}
      />

      {/* カテゴリ別支出 */}
      {summary && summary.categoryBreakdown.length > 0 && (
        <div className="mt-4">
          <CategoryChart breakdown={summary.categoryBreakdown} />
        </div>
      )}

      {/* 最近の記録 */}
      <div className="mt-4">
        <RecentTransactions month={currentMonth} />
      </div>
    </div>
  );
}
