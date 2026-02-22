import { useState } from 'react';
import { CATEGORY_LABELS, type Category, type FixedCost, type AgeTrigger } from '../../types';

interface AddFixedCostModalProps {
  onAdd: (cost: Omit<FixedCost, 'PK' | 'SK' | 'costId' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

/** 設計書 §4-2 初期データ */
const PRESETS: {
  name: string;
  category: Category;
  amount: number;
  billingDay: number;
  ageTriggers?: AgeTrigger[];
}[] = [
  { name: '住宅ローン', category: 'loan', amount: 82000, billingDay: 27 },
  {
    name: '保険',
    category: 'insurance',
    amount: 25000,
    billingDay: 1,
    ageTriggers: [
      { targetMember: 'self', triggerAge: 50, action: 'deactivate', description: '50歳で保険終了' },
    ],
  },
  {
    name: '娘1 塾',
    category: 'education',
    amount: 30000,
    billingDay: 1,
    ageTriggers: [
      { targetMember: 'child1', triggerAge: 9, action: 'update_amount', newAmount: 60000, description: '小3から塾代6万' },
      { targetMember: 'child1', triggerAge: 16, action: 'update_amount', newAmount: 100000, description: '高校生塾10万' },
    ],
  },
  { name: '娘1 ピアノ', category: 'education', amount: 10000, billingDay: 1 },
  { name: '娘1 プール', category: 'education', amount: 10000, billingDay: 1 },
  { name: '娘2 塾', category: 'education', amount: 30000, billingDay: 1 },
  { name: '娘2 ピアノ', category: 'education', amount: 10000, billingDay: 1 },
  { name: '娘2 プール', category: 'education', amount: 10000, billingDay: 1 },
  { name: '電気代', category: 'utility', amount: 12000, billingDay: 15 },
  { name: 'ガス代', category: 'utility', amount: 5000, billingDay: 15 },
  { name: '水道代', category: 'utility', amount: 4000, billingDay: 15 },
  { name: 'スマホ（夫）', category: 'utility', amount: 8000, billingDay: 10 },
  { name: 'スマホ（妻）', category: 'utility', amount: 8000, billingDay: 10 },
  { name: 'ネット回線', category: 'utility', amount: 5000, billingDay: 1 },
];

export function AddFixedCostModal({ onAdd, onClose }: AddFixedCostModalProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category>('other');
  const [billingDay, setBillingDay] = useState('1');
  const [ageTriggers, setAgeTriggers] = useState<AgeTrigger[]>([]);

  const handleSubmit = () => {
    const parsedAmount = parseInt(amount.replace(/[^0-9]/g, ''), 10);
    if (!name.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    onAdd({
      name: name.trim(),
      amount: parsedAmount,
      category,
      billingDay: parseInt(billingDay, 10) || 1,
      isActive: true,
      ageTriggers: ageTriggers.length > 0 ? ageTriggers : undefined,
    });
  };

  const applyPreset = (preset: typeof PRESETS[number]) => {
    setName(preset.name);
    setAmount(String(preset.amount));
    setCategory(preset.category);
    setBillingDay(String(preset.billingDay));
    setAgeTriggers(preset.ageTriggers || []);
  };

  const addTrigger = () => {
    setAgeTriggers(prev => [...prev, {
      targetMember: 'self',
      triggerAge: 50,
      action: 'deactivate',
      description: '',
    }]);
  };

  const updateTrigger = (index: number, updates: Partial<AgeTrigger>) => {
    setAgeTriggers(prev => prev.map((t, i) => i === index ? { ...t, ...updates } : t));
  };

  const removeTrigger = (index: number) => {
    setAgeTriggers(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full max-w-lg mx-auto rounded-t-2xl p-4 pb-8 safe-area-bottom max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">固定費を追加</h3>
          <button onClick={onClose} className="text-slate-400 text-xl">×</button>
        </div>

        <div className="mb-4">
          <p className="text-xs text-slate-500 mb-2">プリセット（設計書 §4-2 初期データ）</p>
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
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="例: 住宅ローン" />
          </div>

          <div>
            <label className="text-xs text-slate-500 block mb-1">月額（円）</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="input-field text-lg font-bold" placeholder="0" />
          </div>

          <div>
            <label className="text-xs text-slate-500 block mb-1">カテゴリ</label>
            <select value={category} onChange={e => setCategory(e.target.value as Category)} className="input-field">
              {ALL_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-500 block mb-1">毎月の計上日</label>
            <select value={billingDay} onChange={e => setBillingDay(e.target.value)} className="input-field">
              {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                <option key={day} value={day}>{day}日</option>
              ))}
            </select>
          </div>

          {/* 設計書 §4-2: 年齢トリガー */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-slate-500">年齢トリガー</label>
              <button onClick={addTrigger} className="text-xs text-primary-600 font-medium">+ 追加</button>
            </div>
            {ageTriggers.map((trigger, i) => (
              <div key={i} className="bg-slate-50 rounded-lg p-3 mb-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">トリガー {i + 1}</span>
                  <button onClick={() => removeTrigger(i)} className="text-[10px] text-red-400">削除</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={trigger.targetMember}
                    onChange={e => updateTrigger(i, { targetMember: e.target.value as AgeTrigger['targetMember'] })}
                    className="input-field text-xs py-1.5"
                  >
                    <option value="self">本人</option>
                    <option value="spouse">配偶者</option>
                    <option value="child1">子供1</option>
                    <option value="child2">子供2</option>
                  </select>
                  <input
                    type="number"
                    value={trigger.triggerAge}
                    onChange={e => updateTrigger(i, { triggerAge: parseInt(e.target.value) || 0 })}
                    className="input-field text-xs py-1.5"
                    placeholder="年齢"
                  />
                </div>
                <select
                  value={trigger.action}
                  onChange={e => updateTrigger(i, { action: e.target.value as AgeTrigger['action'] })}
                  className="input-field text-xs py-1.5"
                >
                  <option value="deactivate">無効化する</option>
                  <option value="update_amount">金額を変更する</option>
                </select>
                {trigger.action === 'update_amount' && (
                  <input
                    type="number"
                    value={trigger.newAmount || ''}
                    onChange={e => updateTrigger(i, { newAmount: parseInt(e.target.value) || 0 })}
                    className="input-field text-xs py-1.5"
                    placeholder="新しい金額"
                  />
                )}
                <input
                  type="text"
                  value={trigger.description}
                  onChange={e => updateTrigger(i, { description: e.target.value })}
                  className="input-field text-xs py-1.5"
                  placeholder="説明（例: 小3から塾代6万）"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1">キャンセル</button>
            <button onClick={handleSubmit} disabled={!name.trim() || !amount} className="btn-primary flex-1">追加</button>
          </div>
        </div>
      </div>
    </div>
  );
}
