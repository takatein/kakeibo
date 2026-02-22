import { CATEGORY_LABELS, CATEGORY_COLORS, type Transaction } from '../../types';
import { formatCurrency, formatDateJa } from '../../utils/format';

interface TransactionItemProps {
  transaction: Transaction;
  onEdit: () => void;
  onDelete: () => void;
}

export function TransactionItem({ transaction, onEdit, onDelete }: TransactionItemProps) {
  const { category, shopName, memo, amount, date, isFixed, inputBy } = transaction;

  return (
    <div className="card flex items-center gap-3">
      <div
        className="w-10 h-10 flex items-center justify-center text-xs font-bold text-white shrink-0"
        style={{ backgroundColor: CATEGORY_COLORS[category], borderRadius: '12px' }}
      >
        {CATEGORY_LABELS[category].charAt(0)}
      </div>

      <div className="flex-1 min-w-0" onClick={onEdit}>
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium truncate" style={{ color: '#1E3A5F' }}>
            {shopName || memo || CATEGORY_LABELS[category]}
          </p>
          {isFixed && (
            <span className="text-[10px] px-1.5 py-0.5 shrink-0"
              style={{ backgroundColor: '#F0F0F0', color: '#94A3B8', borderRadius: '20px' }}>
              固定
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400">
          {formatDateJa(date)} ・ {CATEGORY_LABELS[category]}
          {inputBy === 'secondary' && ' ・ 配偶者'}
        </p>
      </div>

      <div className="text-right shrink-0">
        <p className="text-sm font-bold" style={{ color: '#1E3A5F' }}>{formatCurrency(amount)}</p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-[10px] text-slate-300 hover:text-red-400 transition-colors"
        >
          削除
        </button>
      </div>
    </div>
  );
}
