import { useState, useEffect } from 'react';
import { getFamilySettings, updateFamilySettings } from '../../api/family-settings';
import type { FamilySettings, ChildInfo } from '../../types';

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

  const updateField = <K extends keyof FamilySettings>(
    key: K,
    value: FamilySettings[K]
  ) => {
    setSettings(prev => prev ? { ...prev, [key]: value } : prev);
  };

  const addChild = () => {
    if (!settings) return;
    const newChild: ChildInfo = {
      name: '',
      birthYear: new Date().getFullYear(),
      educationPlan: 'public',
    };
    updateField('children', [...settings.children, newChild]);
  };

  const updateChild = (index: number, updates: Partial<ChildInfo>) => {
    if (!settings) return;
    const children = [...settings.children];
    children[index] = { ...children[index], ...updates };
    updateField('children', children);
  };

  const removeChild = (index: number) => {
    if (!settings) return;
    updateField('children', settings.children.filter((_, i) => i !== index));
  };

  if (!settings) return <div className="text-center py-8 text-slate-400">読み込み中...</div>;

  return (
    <div className="space-y-4">
      {savedMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-center text-sm font-medium">
          {savedMessage}
        </div>
      )}

      {/* 世帯情報 */}
      <div className="card space-y-4">
        <h3 className="text-sm font-bold text-slate-700">世帯情報</h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">夫の名前</label>
            <input
              type="text"
              value={settings.husbandName}
              onChange={e => updateField('husbandName', e.target.value)}
              className="input-field"
              placeholder="太郎"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">妻の名前</label>
            <input
              type="text"
              value={settings.wifeName}
              onChange={e => updateField('wifeName', e.target.value)}
              className="input-field"
              placeholder="花子"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">夫の生年</label>
            <input
              type="number"
              value={settings.husbandBirthYear}
              onChange={e => updateField('husbandBirthYear', parseInt(e.target.value) || 1985)}
              className="input-field"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">妻の生年</label>
            <input
              type="number"
              value={settings.wifeBirthYear}
              onChange={e => updateField('wifeBirthYear', parseInt(e.target.value) || 1987)}
              className="input-field"
            />
          </div>
        </div>
      </div>

      {/* 収入 */}
      <div className="card space-y-4">
        <h3 className="text-sm font-bold text-slate-700">収入</h3>

        <div>
          <label className="text-xs text-slate-500 block mb-1">月収（手取り / 円）</label>
          <input
            type="number"
            value={settings.monthlyIncome}
            onChange={e => updateField('monthlyIncome', parseInt(e.target.value) || 0)}
            className="input-field text-lg font-bold"
          />
        </div>

        <div>
          <label className="text-xs text-slate-500 block mb-1">年間ボーナス（手取り / 円）</label>
          <input
            type="number"
            value={settings.bonusPerYear}
            onChange={e => updateField('bonusPerYear', parseInt(e.target.value) || 0)}
            className="input-field"
          />
        </div>

        <div>
          <label className="text-xs text-slate-500 block mb-1">定年年齢</label>
          <input
            type="number"
            value={settings.retirementAge}
            onChange={e => updateField('retirementAge', parseInt(e.target.value) || 65)}
            className="input-field"
          />
        </div>
      </div>

      {/* 子供 */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-700">子供</h3>
          <button
            onClick={addChild}
            className="text-xs text-primary-600 font-medium"
          >
            + 追加
          </button>
        </div>

        {settings.children.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">
            子供の情報を追加すると教育費をシミュレーションできます
          </p>
        ) : (
          settings.children.map((child, i) => (
            <div key={i} className="bg-slate-50 rounded-xl p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">子供 {i + 1}</span>
                <button
                  onClick={() => removeChild(i)}
                  className="text-xs text-red-400"
                >
                  削除
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">名前</label>
                  <input
                    type="text"
                    value={child.name}
                    onChange={e => updateChild(i, { name: e.target.value })}
                    className="input-field text-sm py-2"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">生年</label>
                  <input
                    type="number"
                    value={child.birthYear}
                    onChange={e => updateChild(i, { birthYear: parseInt(e.target.value) || 2020 })}
                    className="input-field text-sm py-2"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">教育プラン</label>
                <select
                  value={child.educationPlan}
                  onChange={e => updateChild(i, { educationPlan: e.target.value as ChildInfo['educationPlan'] })}
                  className="input-field text-sm py-2"
                >
                  <option value="public">すべて公立</option>
                  <option value="private">すべて私立</option>
                  <option value="mixed">中学から私立</option>
                </select>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 保存 */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="btn-primary w-full"
      >
        {isSaving ? '保存中...' : '設定を保存'}
      </button>
    </div>
  );
}
