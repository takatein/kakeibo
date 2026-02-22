import { useState, useEffect } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { FixedCostList } from './FixedCostList';
import { AddFixedCostModal } from './AddFixedCostModal';
import { FamilySettingsForm } from './FamilySettingsForm';
import { getFixedCosts, addFixedCost, updateFixedCost, deleteFixedCost } from '../../api/fixed-costs';
import type { FixedCost } from '../../types';

type Tab = 'fixed' | 'settings';

export function KnowledgePage() {
  const [tab, setTab] = useState<Tab>('fixed');
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFixedCosts();
  }, []);

  const loadFixedCosts = async () => {
    setIsLoading(true);
    try {
      const costs = await getFixedCosts();
      setFixedCosts(costs);
    } catch (err) {
      console.error('Failed to load fixed costs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async (cost: Omit<FixedCost, 'PK' | 'SK' | 'costId' | 'createdAt' | 'updatedAt'>) => {
    await addFixedCost(cost);
    setShowAddModal(false);
    await loadFixedCosts();
  };

  const handleToggle = async (costId: string, isActive: boolean) => {
    await updateFixedCost(costId, { isActive });
    await loadFixedCosts();
  };

  const handleDelete = async (costId: string) => {
    if (!confirm('この固定費を削除しますか？')) return;
    await deleteFixedCost(costId);
    await loadFixedCosts();
  };

  const monthlyTotal = fixedCosts
    .filter(c => c.isActive)
    .reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="px-4 pb-4">
      <PageHeader title="ナレッジ管理" subtitle="固定費マスタ・家族設定" />

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4">
        {([
          { key: 'fixed' as Tab, label: '固定費マスタ' },
          { key: 'settings' as Tab, label: '家族設定' },
        ]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'fixed' && (
        <>
          <div className="card mb-4 text-center">
            <p className="text-xs text-slate-500">固定費 月額合計</p>
            <p className="text-2xl font-bold text-primary-600">
              ¥{monthlyTotal.toLocaleString()}
            </p>
            <p className="text-xs text-slate-400 mt-1">月初に自動計上されます</p>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-slate-400 text-sm">読み込み中...</div>
          ) : (
            <FixedCostList
              costs={fixedCosts}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary w-full mt-4"
          >
            固定費を追加
          </button>

          {showAddModal && (
            <AddFixedCostModal
              onAdd={handleAdd}
              onClose={() => setShowAddModal(false)}
            />
          )}
        </>
      )}

      {tab === 'settings' && <FamilySettingsForm />}
    </div>
  );
}
