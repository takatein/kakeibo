import { useState } from 'react';
import { CATEGORY_LABELS, CATEGORY_COLORS, type Category, type AiCategorizationResult } from '../../types';
import { formatCurrency, formatDateJa } from '../../utils/format';

interface ConfirmDialogProps {
  result: AiCategorizationResult;
  onConfirm: (confirmed: AiCategorizationResult) => void;
  onCancel: () => void;
  isSaving: boolean;
}

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

export function ConfirmDialog({ result, onConfirm, onCancel, isSaving }: ConfirmDialogProps) {
  const [editedResult, setEditedResult] = useState<AiCategorizationResult>(result);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [editingAmount, setEditingAmount] = useState(false);
  const [amountText, setAmountText] = useState(String(result.amount));

  const handleAmountSave = () => {
    const parsed = parseInt(amountText.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(parsed) && parsed > 0) {
      setEditedResult(prev => ({ ...prev, amount: parsed }));
    }
    setEditingAmount(false);
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🤖</span>
          <h3 className="text-sm font-bold text-slate-700">AIの分類結果</h3>
          <span className="text-[10px] bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
            確信度 {Math.round(result.confidence * 100)}%
          </span>
        </div>

        {/* 日付 */}
        <div className="flex items-center justify-between py-3 border-b border-slate-100">
          <span className="text-sm text-slate-500">日付</span>
          <span className="text-sm font-medium">{formatDateJa(editedResult.date)}</span>
        </div>

        {/* 金額 */}
        <div className="flex items-center justify-between py-3 border-b border-slate-100">
          <span className="text-sm text-slate-500">金額</span>
          {editingAmount ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={amountText}
                onChange={e => setAmountText(e.target.value)}
                className="w-24 text-right input-field py-1 px-2 text-sm"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleAmountSave()}
              />
              <button onClick={handleAmountSave} className="text-primary-600 text-sm font-medium">
                OK
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingAmount(true)}
              className="text-lg font-bold text-primary-600"
            >
              {formatCurrency(editedResult.amount)}
            </button>
          )}
        </div>

        {/* カテゴリ */}
        <div className="flex items-center justify-between py-3 border-b border-slate-100">
          <span className="text-sm text-slate-500">カテゴリ</span>
          <button
            onClick={() => setShowCategoryPicker(!showCategoryPicker)}
            className="flex items-center gap-2"
          >
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: CATEGORY_COLORS[editedResult.category] }}
            />
            <span className="text-sm font-medium">
              {CATEGORY_LABELS[editedResult.category]}
            </span>
            <span className="text-slate-400 text-xs">変更</span>
          </button>
        </div>

        {/* カテゴリピッカー */}
        {showCategoryPicker && (
          <div className="grid grid-cols-3 gap-1.5 py-3 border-b border-slate-100">
            {ALL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setEditedResult(prev => ({ ...prev, category: cat }));
                  setShowCategoryPicker(false);
                }}
                className={`text-xs py-2 px-1 rounded-lg text-center transition-colors ${
                  editedResult.category === cat
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        )}

        {/* 店名 */}
        {editedResult.storeName && (
          <div className="flex items-center justify-between py-3 border-b border-slate-100">
            <span className="text-sm text-slate-500">店名</span>
            <span className="text-sm font-medium">{editedResult.storeName}</span>
          </div>
        )}

        {/* メモ */}
        {editedResult.memo && (
          <div className="py-3">
            <span className="text-sm text-slate-500">メモ</span>
            <p className="text-sm text-slate-600 mt-1">{editedResult.memo}</p>
          </div>
        )}
      </div>

      {/* アクションボタン */}
      <div className="flex gap-3">
        <button onClick={onCancel} className="btn-secondary flex-1">
          やり直す
        </button>
        <button
          onClick={() => onConfirm(editedResult)}
          disabled={isSaving || editedResult.amount <= 0}
          className="btn-primary flex-1"
        >
          {isSaving ? '保存中...' : 'これで記録'}
        </button>
      </div>
    </div>
  );
}
