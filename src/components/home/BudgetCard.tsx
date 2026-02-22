import { formatCurrency } from '../../utils/format';

interface BudgetCardProps {
  monthlyIncome: number;
  totalExpense: number;
  fixedCostsTotal: number;
  variableCostsTotal: number;
  remaining: number;
  comparedToPrevMonth: number;
}

export function BudgetCard({
  monthlyIncome,
  totalExpense,
  remaining,
  comparedToPrevMonth,
}: BudgetCardProps) {
  const isOverBudget = remaining < 0;
  const isLow = remaining >= 0 && remaining < monthlyIncome * 0.2;

  // 残り日数計算
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const currentDay = new Date().getDate();
  const remainingDays = daysInMonth - currentDay;
  const dailyBudget = remaining > 0 && remainingDays > 0
    ? Math.floor(remaining / remainingDays)
    : 0;

  // 色: 余裕=グリーン、残り少ない=オレンジ、赤字=レッド
  const remainingColor = isOverBudget ? '#DC2626' : isLow ? '#E67E22' : '#059669';

  return (
    <div className="card">
      {/* 残り使える金額 — 大きく中央表示 */}
      <div className="text-center mb-5">
        <p className="text-sm text-slate-500 mb-2">残り使える金額</p>
        <p className="font-bold" style={{ color: remainingColor, fontSize: '40px', lineHeight: 1.1 }}>
          {formatCurrency(remaining)}
        </p>
        {dailyBudget > 0 && (
          <p className="text-xs text-slate-400 mt-2">
            1日あたり {formatCurrency(dailyBudget)} × 残り{remainingDays}日
          </p>
        )}
      </div>

      {/* 収入・支出サマリー */}
      <div className="space-y-2 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">収入</span>
          <span className="text-sm font-medium" style={{ color: '#1E3A5F' }}>
            {formatCurrency(monthlyIncome)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">支出</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium" style={{ color: '#1E3A5F' }}>
              {formatCurrency(totalExpense)}
            </span>
            {comparedToPrevMonth !== 0 && (
              <span
                className="text-xs font-medium px-2 py-0.5"
                style={{
                  borderRadius: '20px',
                  backgroundColor: comparedToPrevMonth > 0 ? '#FEE2E2' : '#D1FAE5',
                  color: comparedToPrevMonth > 0 ? '#DC2626' : '#059669',
                }}
              >
                {comparedToPrevMonth > 0 ? '▲' : '▼'}{formatCurrency(Math.abs(comparedToPrevMonth))}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
