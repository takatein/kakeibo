import { useState } from 'react';
import { CATEGORY_LABELS, CATEGORY_COLORS, type Category, type ConfirmItem } from '../../types';
import { formatCurrency, formatDateJa } from '../../utils/format';

interface ConfirmDialogProps {
  items: ConfirmItem[];
  onConfirm: (items: ConfirmItem[]) => void;
  onCancel: () => void;
  isSaving: boolean;
}

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

export function ConfirmDialog({ items: initialItems, onConfirm, onCancel, isSaving }: ConfirmDialogProps) {
  const [items, setItems] = useState<ConfirmItem[]>(initialItems);
  const [showCategoryPicker, setShowCategoryPicker] = useState<string | null>(null);
  const [editingAmountId, setEditingAmountId] = useState<string | null>(null);
  const [amountText, setAmountText] = useState('');

  const updateItem = (tempId: string, updates: Partial<ConfirmItem>) => {
    setItems(prev => prev.map(item =>
      item.tempId === tempId ? { ...item, ...updates } : item
    ));
  };

  const handleAmountSave = (tempId: string) => {
    const parsed = parseInt(amountText.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(parsed) && parsed > 0) {
      updateItem(tempId, { amount: parsed });
    }
    setEditingAmountId(null);
  };

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.tempId} className="card">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🤖</span>
            <h3 className="text-sm font-bold text-slate-700">AI 解釈結果</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
              item.confidence >= 0.8
                ? 'bg-emerald-100 text-emerald-700'
                : item.confidence >= 0.5
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-amber-100 text-amber-700'
            }`}>
              確信度 {Math.round(item.confidence * 100)}%
            </span>
          </div>

          {/* 設計書 §10-3 ConfirmDialog: 店名・金額・カテゴリ・日付、各項目タップで編集 */}

          {/* 店名 */}
          {item.shopName && (
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <span className="text-sm text-slate-500">店名</span>
              <span className="text-sm font-medium">{item.shopName}</span>
            </div>
          )}

          {/* 金額 */}
          <div className="flex items-center justify-between py-3 border-b border-slate-100">
            <span className="text-sm text-slate-500">金額</span>
            {editingAmountId === item.tempId ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={amountText}
                  onChange={e => setAmountText(e.target.value)}
                  className="w-24 text-right input-field py-1 px-2 text-sm"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleAmountSave(item.tempId)}
                />
                <button onClick={() => handleAmountSave(item.tempId)} className="text-primary-600 text-sm font-medium">
                  OK
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setEditingAmountId(item.tempId);
                  setAmountText(String(item.amount));
                }}
                className="text-lg font-bold text-primary-600"
              >
                {formatCurrency(item.amount)}
              </button>
            )}
          </div>

          {/* カテゴリ */}
          <div className="flex items-center justify-between py-3 border-b border-slate-100">
            <span className="text-sm text-slate-500">カテゴリ</span>
            <button
              onClick={() => setShowCategoryPicker(
                showCategoryPicker === item.tempId ? null : item.tempId
              )}
              className="flex items-center gap-2"
            >
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[item.category] }}
              />
              <span className="text-sm font-medium">
                {item.categoryLabel}
              </span>
              <span className="text-slate-400 text-xs">▼</span>
            </button>
          </div>

          {/* カテゴリ選択セレクタ */}
          {showCategoryPicker === item.tempId && (
            <div className="grid grid-cols-3 gap-1.5 py-3 border-b border-slate-100">
              {ALL_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    updateItem(item.tempId, {
                      category: cat,
                      categoryLabel: CATEGORY_LABELS[cat],
                    });
                    setShowCategoryPicker(null);
                  }}
                  className={`text-xs py-2 px-1 rounded-lg text-center transition-colors ${
                    item.category === cat
                      ? 'bg-primary-100 text-primary-700 font-medium'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          )}

          {/* 日付 */}
          <div className="flex items-center justify-between py-3 border-b border-slate-100">
            <span className="text-sm text-slate-500">日付</span>
            <span className="text-sm font-medium">{formatDateJa(item.date)}</span>
          </div>

          {/* メモ */}
          {item.memo && (
            <div className="py-3">
              <span className="text-sm text-slate-500">メモ</span>
              <p className="text-sm text-slate-600 mt-1">{item.memo}</p>
            </div>
          )}
        </div>
      ))}

      {/* アクションボタン */}
      <div className="flex gap-3">
        <button onClick={onCancel} className="btn-secondary flex-1">
          やり直す
        </button>
        <button
          onClick={() => onConfirm(items)}
          disabled={isSaving || items.some(item => item.amount <= 0)}
          className="btn-primary flex-1"
        >
          {isSaving ? '保存中...' : '登録する'}
        </button>
      </div>
    </div>
  );
}
