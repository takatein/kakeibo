import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BudgetCard } from './BudgetCard';
import { CategoryChart } from './CategoryChart';
import { RecentTransactions } from './RecentTransactions';
import { InsightsCard } from './InsightsCard';
import { getMonthlySummary } from '../../api/transactions';
import { getFamilySettings, getTotalMonthlyIncome } from '../../api/family-settings';
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
      const [s, fs] = await Promise.all([
        getMonthlySummary(currentMonth),
        getFamilySettings(),
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

  const monthlyIncome = settings ? getTotalMonthlyIncome(settings) : 0;
  const remaining = monthlyIncome - (summary?.totalExpense || 0);

  return (
    <div className="px-4 pb-4">
      {/* ヘッダー: 月ナビゲーション + 設定ギア */}
      <header className="sticky top-0 z-40 pt-4 pb-2 backdrop-blur-sm"
        style={{ backgroundColor: 'rgba(245, 245, 245, 0.95)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateMonth(-1)}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              ←
            </button>
            <span className="text-lg font-bold" style={{ color: '#1E3A5F' }}>
              {formatMonthJa(currentMonth)}
            </span>
            <button
              onClick={() => navigateMonth(1)}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              →
            </button>
          </div>
          <button
            onClick={() => navigate('/knowledge')}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* ヒーローカード: 残り使える金額 */}
      <BudgetCard
        monthlyIncome={monthlyIncome}
        totalExpense={summary?.totalExpense || 0}
        fixedCostsTotal={summary?.fixedCostsTotal || 0}
        variableCostsTotal={summary?.variableCostsTotal || 0}
        remaining={remaining}
        comparedToPrevMonth={summary?.comparedToPrevMonth || 0}
      />

      {/* カテゴリ別支出 */}
      {summary && summary.categoryBreakdown.length > 0 && (
        <div className="mt-4">
          <CategoryChart
            breakdown={summary.categoryBreakdown}
            onViewDetail={() => navigate('/transactions')}
          />
        </div>
      )}

      {/* AIインサイト */}
      <div className="mt-4">
        <InsightsCard />
      </div>

      {/* 最近の記録 */}
      <div className="mt-4">
        <RecentTransactions month={currentMonth} />
      </div>
    </div>
  );
}
