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
    <div className="space-y-3">
      {costs.map((cost) => (
        <div
          key={cost.costId}
          className={`card ${!cost.isActive ? 'opacity-50' : ''}`}
        >
          <div className="flex items-start gap-3">
            {/* カテゴリカラーバー */}
            <div
              className="w-1 self-stretch rounded-full shrink-0 mt-1"
              style={{ backgroundColor: CATEGORY_COLORS[cost.category] }}
            />

            {/* 内容 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium truncate" style={{ color: '#1E3A5F' }}>
                  {cost.name}
                </p>
                <p className="text-sm font-bold shrink-0" style={{ color: '#1E3A5F' }}>
                  {formatCurrency(cost.amount)}/月
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* カテゴリチップ */}
                <span
                  className="text-[10px] font-medium px-2 py-0.5"
                  style={{
                    borderRadius: '20px',
                    backgroundColor: '#F0F0F0',
                    color: '#6B7280',
                  }}
                >
                  {CATEGORY_LABELS[cost.category]}
                </span>
                <span className="text-xs text-slate-400">毎月{cost.billingDay}日</span>
              </div>

              {/* 年齢トリガーバッジ */}
              {cost.ageTriggers && cost.ageTriggers.length > 0 && (
                <div className="mt-2 space-y-1">
                  {cost.ageTriggers.map((trigger, i) => (
                    <div
                      key={i}
                      className="inline-flex items-center gap-1 mr-2 text-xs px-2.5 py-1"
                      style={{
                        backgroundColor: '#FDEBD0',
                        color: '#E67E22',
                        borderRadius: '20px',
                      }}
                    >
                      <span>⚡</span>
                      <span>{trigger.description}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
