import { CATEGORY_LABELS, CATEGORY_COLORS, type FixedCost } from '../../types';
import { formatCurrency } from '../../utils/format';

interface FixedCostListProps {
  costs: FixedCost[];
  onToggle: (costId: string, isActive: boolean) => void;
  onDelete: (costId: string) => void;
}

export function FixedCostList({ costs, onToggle, onDelete }: FixedCostListProps) {
  if (costs.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-slate-400 text-sm">固定費がまだ登録されていません</p>
        <p className="text-slate-400 text-xs mt-2">
          ローン・保険・習い事などを登録すると<br />毎月自動で計上されます
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {costs.map((cost) => (
        <div
          key={cost.costId}
          className={`card flex items-center gap-3 ${!cost.isActive ? 'opacity-50' : ''}`}
        >
          <button
            onClick={() => onToggle(cost.costId, !cost.isActive)}
            className={`w-5 h-5 rounded-full border-2 shrink-0 transition-colors ${
              cost.isActive ? 'bg-primary-600 border-primary-600' : 'border-slate-300'
            }`}
          >
            {cost.isActive && (
              <span className="text-white text-xs flex items-center justify-center">✓</span>
            )}
          </button>

          <div
            className="w-1 h-8 rounded-full shrink-0"
            style={{ backgroundColor: CATEGORY_COLORS[cost.category] }}
          />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">{cost.name}</p>
            <p className="text-xs text-slate-400">
              {CATEGORY_LABELS[cost.category]} ・ 毎月{cost.billingDay}日
              {cost.ageTriggers && cost.ageTriggers.length > 0 && (
                <span className="text-primary-500"> ・ 年齢トリガー{cost.ageTriggers.length}件</span>
              )}
            </p>
            {/* 設計書 §4-2: AgeTrigger表示 */}
            {cost.ageTriggers && cost.ageTriggers.length > 0 && (
              <div className="mt-1 space-y-0.5">
                {cost.ageTriggers.map((trigger, i) => (
                  <p key={i} className="text-[10px] text-slate-400">
                    → {trigger.description}
                  </p>
                ))}
              </div>
            )}
          </div>

          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-slate-700">{formatCurrency(cost.amount)}</p>
            <button
              onClick={() => onDelete(cost.costId)}
              className="text-[10px] text-slate-300 hover:text-red-400"
            >
              削除
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
