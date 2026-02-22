import { useState } from 'react';
import { CATEGORY_LABELS, type Category, type FixedCost } from '../../types';

interface AddFixedCostModalProps {
  onAdd: (cost: Omit<FixedCost, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

const PRESETS = [
  { name: '住宅ローン', category: 'loan' as Category, amount: 100000, billingDay: 27 },
  { name: '生命保険', category: 'insurance' as Category, amount: 15000, billingDay: 1 },
  { name: '電気代', category: 'utilities' as Category, amount: 12000, billingDay: 15 },
  { name: 'ガス代', category: 'utilities' as Category, amount: 5000, billingDay: 15 },
  { name: '水道代', category: 'utilities' as Category, amount: 4000, billingDay: 15 },
  { name: 'スマホ（夫）', category: 'communication' as Category, amount: 8000, billingDay: 10 },
  { name: 'スマホ（妻）', category: 'communication' as Category, amount: 8000, billingDay: 10 },
  { name: 'ネット回線', category: 'communication' as Category, amount: 5000, billingDay: 1 },
  { name: '習い事（子供）', category: 'education' as Category, amount: 10000, billingDay: 5 },
  { name: 'Netflix', category: 'subscription' as Category, amount: 1490, billingDay: 1 },
];

export function AddFixedCostModal({ onAdd, onClose }: AddFixedCostModalProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category>('other');
  const [billingDay, setBillingDay] = useState('1');
  const [endAge, setEndAge] = useState('');

  const handleSubmit = () => {
    const parsedAmount = parseInt(amount.replace(/[^0-9]/g, ''), 10);
    if (!name.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    onAdd({
      userId: 'demo-user',
      name: name.trim(),
      amount: parsedAmount,
      category,
      billingDay: parseInt(billingDay, 10) || 1,
      endAge: endAge ? parseInt(endAge, 10) : undefined,
      isActive: true,
    });
  };

  const applyPreset = (preset: typeof PRESETS[number]) => {
    setName(preset.name);
    setAmount(String(preset.amount));
    setCategory(preset.category);
    setBillingDay(String(preset.billingDay));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full max-w-lg mx-auto rounded-t-2xl p-4 pb-8 safe-area-bottom max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">固定費を追加</h3>
          <button onClick={onClose} className="text-slate-400 text-xl">×</button>
        </div>

        {/* プリセット */}
        <div className="mb-4">
          <p className="text-xs text-slate-500 mb-2">よくある固定費</p>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="bg-slate-50 border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-600 hover:bg-primary-50 hover:border-primary-200 transition-colors"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">名称</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="input-field"
              placeholder="例: 住宅ローン"
            />
          </div>

          <div>
            <label className="text-xs text-slate-500 block mb-1">月額（円）</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="input-field text-lg font-bold"
              placeholder="0"
            />
          </div>

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

          <div>
            <label className="text-xs text-slate-500 block mb-1">毎月の計上日</label>
            <select
              value={billingDay}
              onChange={e => setBillingDay(e.target.value)}
              className="input-field"
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                <option key={day} value={day}>{day}日</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-500 block mb-1">終了年齢（任意）</label>
            <input
              type="number"
              value={endAge}
              onChange={e => setEndAge(e.target.value)}
              className="input-field"
              placeholder="例: 65（空欄なら無期限）"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1">
              キャンセル
            </button>
            <button
              onClick={handleSubmit}
              disabled={!name.trim() || !amount}
              className="btn-primary flex-1"
            >
              追加
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
