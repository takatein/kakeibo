import { formatCurrency } from '../../utils/format';

interface BudgetCardProps {
  monthlyBudget: number;
  totalExpense: number;
  fixedExpense: number;
  variableExpense: number;
  remaining: number;
}

export function BudgetCard({
  monthlyBudget,
  totalExpense,
  fixedExpense,
  variableExpense,
  remaining,
}: BudgetCardProps) {
  const usagePercent = monthlyBudget > 0
    ? Math.min((totalExpense / monthlyBudget) * 100, 100)
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
      {/* メイン：残り使える金額 */}
      <div className="text-center mb-4">
        <p className="text-sm text-slate-500 mb-1">今月あと使える金額</p>
        <p className={`text-3xl font-bold ${isOverBudget ? 'text-red-500' : 'text-primary-600'}`}>
          {formatCurrency(remaining)}
        </p>
        {dailyBudget > 0 && (
          <p className="text-xs text-slate-400 mt-1">
            1日あたり {formatCurrency(dailyBudget)} × 残り{remainingDays}日
          </p>
        )}
      </div>

      {/* プログレスバー */}
      <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden mb-4">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
            isOverBudget ? 'bg-red-500' : usagePercent > 80 ? 'bg-amber-500' : 'bg-primary-500'
          }`}
          style={{ width: `${Math.min(usagePercent, 100)}%` }}
        />
      </div>

      {/* 内訳 */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-slate-400">収入</p>
          <p className="text-sm font-medium">{formatCurrency(monthlyBudget)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">固定費</p>
          <p className="text-sm font-medium text-slate-600">{formatCurrency(fixedExpense)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">変動費</p>
          <p className="text-sm font-medium text-slate-600">{formatCurrency(variableExpense)}</p>
        </div>
      </div>
    </div>
  );
}
