import type { IconType } from 'react-icons';
import {
  LuCookingPot,
  LuUtensils,
  LuWine,
  LuShoppingBag,
  LuBaby,
  LuGraduationCap,
  LuMapPin,
  LuPlane,
  LuStethoscope,
  LuLightbulb,
  LuShield,
  LuHome,
  LuCar,
  LuGamepad2,
  LuMoreHorizontal,
} from 'react-icons/lu';
import { CATEGORY_COLORS, type CategoryBreakdown } from '../../types';
import { formatCurrency } from '../../utils/format';

/** カテゴリアイコンマッピング */
const CATEGORY_ICONS: Record<string, IconType> = {
  food_home: LuCookingPot,
  food_restaurant: LuUtensils,
  food_premium: LuWine,
  daily_goods: LuShoppingBag,
  children: LuBaby,
  education: LuGraduationCap,
  outing: LuMapPin,
  travel: LuPlane,
  medical: LuStethoscope,
  utility: LuLightbulb,
  insurance: LuShield,
  loan: LuHome,
  car: LuCar,
  hobby: LuGamepad2,
  other: LuMoreHorizontal,
};

const FIXED_CATEGORIES = ['utility', 'insurance', 'loan', 'education'];

interface CategoryChartProps {
  breakdown: CategoryBreakdown[];
  onViewDetail?: () => void;
}

export function CategoryChart({ breakdown, onViewDetail }: CategoryChartProps) {
  const maxAmount = Math.max(...breakdown.map(b => b.amount));

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold" style={{ color: '#1E3A5F' }}>カテゴリ別支出</h3>
        {onViewDetail && (
          <button
            onClick={onViewDetail}
            className="text-xs font-medium"
            style={{ color: '#2E86C1' }}
          >
            詳細 ›
          </button>
        )}
      </div>

      <div className="space-y-3">
        {breakdown.slice(0, 6).map((item) => {
          const isFixed = FIXED_CATEGORIES.includes(item.category);
          const barPercent = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;
          const Icon = CATEGORY_ICONS[item.category] || LuMoreHorizontal;

          return (
            <div key={item.category} className={isFixed ? 'opacity-75' : ''}>
              <div className="flex items-center gap-3">
                {/* アイコン + ラベル */}
                <div className="flex items-center gap-2 w-24 shrink-0">
                  <Icon size={16} color={isFixed ? '#94A3B8' : CATEGORY_COLORS[item.category]} />
                  <span className="text-xs text-slate-600 truncate">{item.label}</span>
                </div>

                {/* プログレスバー */}
                <div className="flex-1 h-6 rounded-full overflow-hidden"
                  style={{ backgroundColor: isFixed ? '#F0F0F0' : '#F5F5F5' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(barPercent, 3)}%`,
                      backgroundColor: isFixed ? '#94A3B8' : CATEGORY_COLORS[item.category],
                    }}
                  />
                </div>

                {/* 金額 + 自動バッジ */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-sm font-bold" style={{ color: '#1E3A5F' }}>
                    {formatCurrency(item.amount)}
                  </span>
                  {isFixed && (
                    <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: '#F0F0F0' }}>
                      自動
                    </span>
                  )}
                </div>
              </div>

              {/* 超過表示 */}
              {item.budgetAmount && item.amount > item.budgetAmount && (
                <div className="flex justify-end mt-0.5">
                  <span className="text-[10px] font-medium" style={{ color: '#DC2626' }}>
                    予算超過 +{formatCurrency(item.amount - item.budgetAmount)}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {breakdown.length > 6 && (
        <p className="text-xs text-slate-400 text-center mt-3">
          他 {breakdown.length - 6} カテゴリ
        </p>
      )}
    </div>
  );
}
