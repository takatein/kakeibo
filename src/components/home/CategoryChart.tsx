import { CATEGORY_COLORS, type CategoryBreakdown } from '../../types';
import { formatCurrency, formatPercent } from '../../utils/format';

interface CategoryChartProps {
  breakdown: CategoryBreakdown[];
}

export function CategoryChart({ breakdown }: CategoryChartProps) {
  const total = breakdown.reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="card">
      <h3 className="text-sm font-bold text-slate-700 mb-3">カテゴリ別支出</h3>

      {/* 設計書 §10-3 横棒グラフ風。タップで明細へ */}
      <div className="space-y-2">
        {breakdown.slice(0, 8).map((item) => (
          <div key={item.category}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs text-slate-600">{item.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-700">
                  {formatCurrency(item.amount)}
                </span>
                {item.budgetAmount && item.amount > item.budgetAmount && (
                  <span className="text-[10px] text-red-500 font-medium">超過</span>
                )}
              </div>
            </div>
            <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                style={{
                  width: `${total > 0 ? (item.amount / total) * 100 : 0}%`,
                  backgroundColor: CATEGORY_COLORS[item.category],
                }}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {formatPercent(item.percentage)} ・ {item.count}件
            </p>
          </div>
        ))}
      </div>

      {breakdown.length > 8 && (
        <p className="text-xs text-slate-400 text-center mt-2">
          他 {breakdown.length - 8} カテゴリ
        </p>
      )}
    </div>
  );
}
