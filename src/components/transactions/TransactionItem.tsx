import { CATEGORY_LABELS, CATEGORY_COLORS, type Transaction } from '../../types';
import { formatCurrency, formatDateJa } from '../../utils/format';

interface TransactionItemProps {
  transaction: Transaction;
  onEdit: () => void;
  onDelete: () => void;
}

export function TransactionItem({ transaction, onEdit, onDelete }: TransactionItemProps) {
  const { category, storeName, memo, amount, date, isFixed, inputBy } = transaction;

  return (
    <div className="card flex items-center gap-3">
      {/* カテゴリアイコン */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0"
        style={{ backgroundColor: CATEGORY_COLORS[category] }}
      >
        {CATEGORY_LABELS[category].charAt(0)}
      </div>

      {/* 詳細 */}
      <div className="flex-1 min-w-0" onClick={onEdit}>
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-slate-700 truncate">
            {storeName || memo || CATEGORY_LABELS[category]}
          </p>
          {isFixed && (
            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded shrink-0">
              固定
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400">
          {formatDateJa(date)} ・ {CATEGORY_LABELS[category]}
          {inputBy === 'wife' && ' ・ 妻'}
        </p>
      </div>

      {/* 金額 & 削除 */}
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-slate-800">{formatCurrency(amount)}</p>
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
