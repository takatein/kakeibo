import { useState } from 'react';
import { CATEGORY_LABELS, type Category, type Transaction } from '../../types';
import { formatCurrency } from '../../utils/format';

interface EditTransactionModalProps {
  transaction: Transaction;
  onSave: (updates: Partial<Transaction>) => void;
  onClose: () => void;
}

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

export function EditTransactionModal({ transaction, onSave, onClose }: EditTransactionModalProps) {
  const [amount, setAmount] = useState(String(transaction.amount));
  const [category, setCategory] = useState<Category>(transaction.category);
  const [storeName, setStoreName] = useState(transaction.storeName || '');
  const [memo, setMemo] = useState(transaction.memo || '');
  const [date, setDate] = useState(transaction.date);

  const handleSave = () => {
    const parsedAmount = parseInt(amount.replace(/[^0-9]/g, ''), 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    onSave({
      amount: parsedAmount,
      category,
      storeName: storeName || undefined,
      memo: memo || undefined,
      date,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full max-w-lg mx-auto rounded-t-2xl p-4 pb-8 safe-area-bottom animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">記録を編集</h3>
          <button onClick={onClose} className="text-slate-400 text-xl">
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* 日付 */}
          <div>
            <label className="text-xs text-slate-500 block mb-1">日付</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="input-field"
            />
          </div>

          {/* 金額 */}
          <div>
            <label className="text-xs text-slate-500 block mb-1">金額</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="input-field text-lg font-bold"
              placeholder="0"
            />
          </div>

          {/* カテゴリ */}
          <div>
            <label className="text-xs text-slate-500 block mb-1">カテゴリ</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as Category)}
              className="input-field"
            >
              {ALL_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
              ))}
            </select>
          </div>

          {/* 店名 */}
          <div>
            <label className="text-xs text-slate-500 block mb-1">店名</label>
            <input
              type="text"
              value={storeName}
              onChange={e => setStoreName(e.target.value)}
              className="input-field"
              placeholder="任意"
            />
          </div>

          {/* メモ */}
          <div>
            <label className="text-xs text-slate-500 block mb-1">メモ</label>
            <input
              type="text"
              value={memo}
              onChange={e => setMemo(e.target.value)}
              className="input-field"
              placeholder="任意"
            />
          </div>

          {/* 保存ボタン */}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1">
              キャンセル
            </button>
            <button onClick={handleSave} className="btn-primary flex-1">
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
