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
  fixedCostsTotal,
  variableCostsTotal,
  remaining,
  comparedToPrevMonth,
}: BudgetCardProps) {
  const usagePercent = monthlyIncome > 0
    ? Math.min((totalExpense / monthlyIncome) * 100, 100)
    : 0;

  const isOverBudget = remaining < 0;
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const currentDay = new Date().getDate();
  const remainingDays = daysInMonth - currentDay;
  const dailyBudget = remaining > 0 && remainingDays > 0
    ? Math.floor(remaining / remainingDays)
    : 0;

  return (
    <div className="card">
      {/* 設計書 §10-3: 残り使える金額（色: 余裕=緑、残り少ない=オレンジ） */}
      <div className="text-center mb-4">
        <p className="text-sm text-slate-500 mb-1">残り使える金額</p>
        <p className={`text-3xl font-bold ${
          isOverBudget ? 'text-red-500' : remaining < monthlyIncome * 0.2 ? 'text-amber-500' : 'text-emerald-600'
        }`}>
          {formatCurrency(remaining)}
        </p>
        {dailyBudget > 0 && (
          <p className="text-xs text-slate-400 mt-1">
            1日あたり {formatCurrency(dailyBudget)} × 残り{remainingDays}日
          </p>
        )}
      </div>

      <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden mb-4">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
            isOverBudget ? 'bg-red-500' : usagePercent > 80 ? 'bg-amber-500' : 'bg-emerald-500'
          }`}
          style={{ width: `${Math.min(usagePercent, 100)}%` }}
        />
      </div>

      {/* 設計書 §10-3: 収入・支出・前月比 */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-slate-400">収入</p>
          <p className="text-sm font-medium">{formatCurrency(monthlyIncome)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">固定費</p>
          <p className="text-sm font-medium text-slate-500">{formatCurrency(fixedCostsTotal)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">変動費</p>
          <p className="text-sm font-medium text-slate-600">{formatCurrency(variableCostsTotal)}</p>
        </div>
      </div>

      {comparedToPrevMonth !== 0 && (
        <div className="mt-3 text-center">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            comparedToPrevMonth > 0
              ? 'bg-red-50 text-red-600'
              : 'bg-emerald-50 text-emerald-600'
          }`}>
            前月比 {comparedToPrevMonth > 0 ? '+' : ''}{formatCurrency(comparedToPrevMonth)}
          </span>
        </div>
      )}
    </div>
  );
}
