import { useState } from 'react';
import { LuStore, LuTag, LuCalendar } from 'react-icons/lu';
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
      {/* セクションラベル */}
      <div className="flex items-center gap-2 px-1">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-xs text-slate-400 font-medium">AI 解釈結果</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      {items.map((item) => {
        const isLowConfidence = item.confidence < 0.5;

        return (
          <div
            key={item.tempId}
            className="card relative overflow-hidden"
            style={{
              backgroundColor: '#D6E4F0',
              borderLeft: isLowConfidence ? '4px solid #E67E22' : 'none',
            }}
          >
            {/* 確信度バッジ */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500">AIの確信度</span>
              <span
                className="text-[11px] font-medium px-2.5 py-0.5"
                style={{
                  borderRadius: '20px',
                  backgroundColor: item.confidence >= 0.8 ? '#D1FAE5' : item.confidence >= 0.5 ? '#DBEAFE' : '#FDEBD0',
                  color: item.confidence >= 0.8 ? '#059669' : item.confidence >= 0.5 ? '#2563EB' : '#E67E22',
                }}
              >
                {item.confidence >= 0.8 ? '高' : item.confidence >= 0.5 ? '中' : '低'}
                {' '}{Math.round(item.confidence * 100)}%
              </span>
            </div>

            {/* 店名 */}
            {item.shopName && (
              <div className="flex items-center justify-between py-3 border-b border-white/50">
                <div className="flex items-center gap-2">
                  <LuStore size={14} className="text-slate-400" />
                  <span className="text-sm text-slate-500">店名</span>
                </div>
                <span className="text-sm font-medium" style={{ color: '#1E3A5F' }}>
                  {item.shopName} ›
                </span>
              </div>
            )}

            {/* 金額 */}
            <div className="flex items-center justify-between py-3 border-b border-white/50">
              <div className="flex items-center gap-2">
                <span className="text-sm">¥</span>
                <span className="text-sm text-slate-500">金額</span>
              </div>
              {editingAmountId === item.tempId ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={amountText}
                    onChange={e => setAmountText(e.target.value)}
                    className="w-24 text-right py-1 px-2 text-sm bg-white"
                    style={{ borderRadius: '8px', border: '2px solid #2E86C1' }}
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleAmountSave(item.tempId)}
                  />
                  <button
                    onClick={() => handleAmountSave(item.tempId)}
                    className="text-sm font-medium"
                    style={{ color: '#2E86C1' }}
                  >
                    OK
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditingAmountId(item.tempId);
                    setAmountText(String(item.amount));
                  }}
                  className="text-lg font-bold"
                  style={{ color: '#1E3A5F' }}
                >
                  {formatCurrency(item.amount)} ›
                </button>
              )}
            </div>

            {/* カテゴリ */}
            <div className="flex items-center justify-between py-3 border-b border-white/50">
              <div className="flex items-center gap-2">
                <LuTag size={14} className="text-slate-400" />
                <span className="text-sm text-slate-500">カテゴリ</span>
              </div>
              <button
                onClick={() => setShowCategoryPicker(
                  showCategoryPicker === item.tempId ? null : item.tempId
                )}
                className="flex items-center gap-2"
              >
                <span
                  className="px-2.5 py-1 text-xs font-medium text-white"
                  style={{
                    backgroundColor: CATEGORY_COLORS[item.category],
                    borderRadius: '20px',
                  }}
                >
                  {item.categoryLabel}
                </span>
                <span className="text-slate-400 text-xs">›</span>
              </button>
            </div>

            {/* カテゴリ選択ピッカー */}
            {showCategoryPicker === item.tempId && (
              <div className="grid grid-cols-3 gap-1.5 py-3 border-b border-white/50">
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
                    className="text-xs py-2 px-1 text-center transition-colors"
                    style={{
                      borderRadius: '10px',
                      backgroundColor: item.category === cat ? '#1E3A5F' : 'rgba(255,255,255,0.7)',
                      color: item.category === cat ? '#FFFFFF' : '#374151',
                      fontWeight: item.category === cat ? '600' : '400',
                    }}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            )}

            {/* 日付 */}
            <div className="flex items-center justify-between py-3 border-b border-white/50">
              <div className="flex items-center gap-2">
                <LuCalendar size={14} className="text-slate-400" />
                <span className="text-sm text-slate-500">日付</span>
              </div>
              <span className="text-sm font-medium" style={{ color: '#1E3A5F' }}>
                {formatDateJa(item.date)} ›
              </span>
            </div>

            {/* 代替カテゴリ候補 */}
            {item.alternativeCategories && item.alternativeCategories.length > 0 && (
              <div className="pt-3">
                <span className="text-xs text-slate-500 block mb-2">もしかして:</span>
                <div className="flex flex-wrap gap-1.5">
                  {item.alternativeCategories.map((alt) => (
                    <button
                      key={alt.category}
                      onClick={() => updateItem(item.tempId, {
                        category: alt.category,
                        categoryLabel: alt.label,
                      })}
                      className="text-xs px-3 py-1.5 bg-white/70 text-slate-600 hover:bg-white transition-colors"
                      style={{ borderRadius: '20px' }}
                    >
                      {alt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* 登録ボタン — フル幅、余白多め */}
      <div className="pt-4 space-y-3">
        <button
          onClick={() => onConfirm(items)}
          disabled={isSaving || items.some(item => item.amount <= 0)}
          className="btn-primary w-full flex items-center justify-center gap-2 text-base"
          style={{ padding: '14px 24px' }}
        >
          {isSaving ? '保存中...' : '登録する →'}
        </button>
        <button
          onClick={onCancel}
          className="btn-secondary w-full text-sm"
        >
          やり直す
        </button>
      </div>
    </div>
  );
}
