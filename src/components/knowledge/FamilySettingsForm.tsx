import { useState, useEffect } from 'react';
import { getFamilySettings, updateFamilySettings } from '../../api/family-settings';
import type { FamilySettings, FamilyMember } from '../../types';

export function FamilySettingsForm() {
  const [settings, setSettings] = useState<FamilySettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    getFamilySettings().then(setSettings);
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      await updateFamilySettings(settings);
      setSavedMessage('保存しました');
      setTimeout(() => setSavedMessage(''), 2000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const updateMember = (key: 'self' | 'spouse' | 'child1' | 'child2', updates: Partial<FamilyMember>) => {
    if (!settings) return;
    const current = settings.members[key] || { name: '', birthYear: 2020, birthMonth: 1 };
    setSettings({
      ...settings,
      members: {
        ...settings.members,
        [key]: { ...current, ...updates },
      },
    });
  };

  const toggleChild = (key: 'child1' | 'child2') => {
    if (!settings) return;
    if (settings.members[key]) {
      const newMembers = { ...settings.members };
      delete newMembers[key];
      setSettings({ ...settings, members: newMembers });
    } else {
      updateMember(key, { name: '', birthYear: 2022, birthMonth: 1 });
    }
  };

  if (!settings) return <div className="text-center py-8 text-slate-400">読み込み中...</div>;

  return (
    <div className="space-y-4">
      {savedMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-center text-sm font-medium">
          {savedMessage}
        </div>
      )}

      {/* 設計書 §4-3: members */}
      <div className="card space-y-4">
        <h3 className="text-sm font-bold text-slate-700">世帯情報</h3>

        {/* 本人 */}
        <div className="bg-slate-50 rounded-lg p-3 space-y-2">
          <span className="text-xs font-medium text-slate-600">本人 (primary)</span>
          <div className="grid grid-cols-3 gap-2">
            <input type="text" value={settings.members.self.name} onChange={e => updateMember('self', { name: e.target.value })} className="input-field text-sm py-2" placeholder="名前" />
            <input type="number" value={settings.members.self.birthYear} onChange={e => updateMember('self', { birthYear: parseInt(e.target.value) || 1990 })} className="input-field text-sm py-2" placeholder="生年" />
            <input type="number" value={settings.members.self.birthMonth} onChange={e => updateMember('self', { birthMonth: parseInt(e.target.value) || 1 })} className="input-field text-sm py-2" placeholder="月" min={1} max={12} />
          </div>
        </div>

        {/* 配偶者 */}
        <div className="bg-slate-50 rounded-lg p-3 space-y-2">
          <span className="text-xs font-medium text-slate-600">配偶者 (secondary)</span>
          <div className="grid grid-cols-3 gap-2">
            <input type="text" value={settings.members.spouse.name} onChange={e => updateMember('spouse', { name: e.target.value })} className="input-field text-sm py-2" placeholder="名前" />
            <input type="number" value={settings.members.spouse.birthYear} onChange={e => updateMember('spouse', { birthYear: parseInt(e.target.value) || 1990 })} className="input-field text-sm py-2" placeholder="生年" />
            <input type="number" value={settings.members.spouse.birthMonth} onChange={e => updateMember('spouse', { birthMonth: parseInt(e.target.value) || 1 })} className="input-field text-sm py-2" placeholder="月" min={1} max={12} />
          </div>
        </div>

        {/* 子供1 */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <input type="checkbox" checked={!!settings.members.child1} onChange={() => toggleChild('child1')} className="rounded" />
            <span className="text-xs font-medium text-slate-600">子供1</span>
          </div>
          {settings.members.child1 && (
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="grid grid-cols-3 gap-2">
                <input type="text" value={settings.members.child1.name} onChange={e => updateMember('child1', { name: e.target.value })} className="input-field text-sm py-2" placeholder="名前" />
                <input type="number" value={settings.members.child1.birthYear} onChange={e => updateMember('child1', { birthYear: parseInt(e.target.value) || 2020 })} className="input-field text-sm py-2" placeholder="生年" />
                <input type="number" value={settings.members.child1.birthMonth} onChange={e => updateMember('child1', { birthMonth: parseInt(e.target.value) || 1 })} className="input-field text-sm py-2" placeholder="月" min={1} max={12} />
              </div>
            </div>
          )}
        </div>

        {/* 子供2 */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <input type="checkbox" checked={!!settings.members.child2} onChange={() => toggleChild('child2')} className="rounded" />
            <span className="text-xs font-medium text-slate-600">子供2</span>
          </div>
          {settings.members.child2 && (
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="grid grid-cols-3 gap-2">
                <input type="text" value={settings.members.child2.name} onChange={e => updateMember('child2', { name: e.target.value })} className="input-field text-sm py-2" placeholder="名前" />
                <input type="number" value={settings.members.child2.birthYear} onChange={e => updateMember('child2', { birthYear: parseInt(e.target.value) || 2020 })} className="input-field text-sm py-2" placeholder="生年" />
                <input type="number" value={settings.members.child2.birthMonth} onChange={e => updateMember('child2', { birthMonth: parseInt(e.target.value) || 1 })} className="input-field text-sm py-2" placeholder="月" min={1} max={12} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 設計書 §4-3: income */}
      <div className="card space-y-4">
        <h3 className="text-sm font-bold text-slate-700">収入</h3>
        <div>
          <label className="text-xs text-slate-500 block mb-1">本人 手取り月収（円）</label>
          <input type="number" value={settings.income.selfMonthlyNet} onChange={e => setSettings({...settings, income: {...settings.income, selfMonthlyNet: parseInt(e.target.value) || 0}})} className="input-field text-lg font-bold" />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">配偶者 手取り月収（円）</label>
          <input type="number" value={settings.income.spouseMonthlyNet} onChange={e => setSettings({...settings, income: {...settings.income, spouseMonthlyNet: parseInt(e.target.value) || 0}})} className="input-field" />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">その他月収（贈与等）</label>
          <input type="number" value={settings.income.otherMonthlyIncome} onChange={e => setSettings({...settings, income: {...settings.income, otherMonthlyIncome: parseInt(e.target.value) || 0}})} className="input-field" />
        </div>
      </div>

      {/* 設計書 §4-3: assets + loan */}
      <div className="card space-y-4">
        <h3 className="text-sm font-bold text-slate-700">資産・ローン</h3>
        <div>
          <label className="text-xs text-slate-500 block mb-1">現在の貯蓄額（円）</label>
          <input type="number" value={settings.assets.currentSavings} onChange={e => setSettings({...settings, assets: {...settings.assets, currentSavings: parseInt(e.target.value) || 0}})} className="input-field text-lg font-bold" step={1000000} />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">住宅ローン月額（円）</label>
          <input type="number" value={settings.loan.monthlyPayment} onChange={e => setSettings({...settings, loan: {...settings.loan, monthlyPayment: parseInt(e.target.value) || 0}})} className="input-field" />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">ローン残り月数</label>
          <input type="number" value={settings.loan.remainingMonths} onChange={e => setSettings({...settings, loan: {...settings.loan, remainingMonths: parseInt(e.target.value) || 0}})} className="input-field" />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">変動金利（%）</label>
          <input type="number" value={settings.loan.interestRate} onChange={e => setSettings({...settings, loan: {...settings.loan, interestRate: parseFloat(e.target.value) || 0}})} className="input-field" step={0.1} />
        </div>
      </div>

      <button onClick={handleSave} disabled={isSaving} className="btn-primary w-full">
        {isSaving ? '保存中...' : '設定を保存'}
      </button>
    </div>
  );
}
