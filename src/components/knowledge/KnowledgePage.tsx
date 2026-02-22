import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../layout/PageHeader';
import { FixedCostList } from './FixedCostList';
import { AddFixedCostModal } from './AddFixedCostModal';
import { FamilySettingsForm } from './FamilySettingsForm';
import { getFixedCosts, addFixedCost, updateFixedCost, deleteFixedCost } from '../../api/fixed-costs';
import type { FixedCost } from '../../types';

type Tab = 'fixed' | 'patterns' | 'settings';

export function KnowledgePage() {
  const navigate = useNavigate();
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

  // Mock pending patterns count
  const pendingPatternsCount = 2;

  return (
    <div className="px-4 pb-4 relative min-h-screen">
      <PageHeader
        title="ナレッジ管理"
        leftAction={
          <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-600">←</button>
        }
      />

      {/* タブ: 固定費 / AIパターン — アンダーライン型 */}
      <div className="flex mb-5 border-b border-slate-200">
        {([
          { key: 'fixed' as Tab, label: '固定費' },
          { key: 'patterns' as Tab, label: 'AIパターン' },
          { key: 'settings' as Tab, label: '家族設定' },
        ]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex-1 py-3 text-sm font-medium text-center transition-colors relative"
            style={{
              color: tab === key ? '#1E3A5F' : '#9CA3AF',
            }}
          >
            {label}
            {key === 'patterns' && pendingPatternsCount > 0 && (
              <span className="absolute -top-1 right-2 w-4 h-4 text-[10px] text-white rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#E67E22' }}>
                {pendingPatternsCount}
              </span>
            )}
            {tab === key && (
              <div className="absolute bottom-0 left-4 right-4 h-0.5" style={{ backgroundColor: '#2E86C1' }} />
            )}
          </button>
        ))}
      </div>

      {tab === 'fixed' && (
        <>
          {/* 月額合計サマリー */}
          <p className="text-xs text-slate-400 mb-3 px-1">毎月自動計上される支出</p>

          {isLoading ? (
            <div className="text-center py-8 text-slate-400 text-sm">読み込み中...</div>
          ) : (
            <FixedCostList
              costs={fixedCosts}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          )}

          {/* FABボタン */}
          <button
            onClick={() => setShowAddModal(true)}
            className="fixed bottom-24 right-6 w-14 h-14 rounded-full text-white text-2xl flex items-center justify-center z-40"
            style={{
              backgroundColor: '#1E3A5F',
              boxShadow: '0 4px 12px rgba(30, 58, 95, 0.4)',
            }}
          >
            +
          </button>

          {/* AIパターン通知バナー */}
          {pendingPatternsCount > 0 && (
            <button
              onClick={() => setTab('patterns')}
              className="w-full mt-4 py-3 px-4 text-left text-sm font-medium flex items-center justify-between"
              style={{
                backgroundColor: '#FDEBD0',
                borderRadius: '12px',
                color: '#E67E22',
              }}
            >
              <span>AIパターン (承認待ち {pendingPatternsCount}件)</span>
              <span>›</span>
            </button>
          )}

          {showAddModal && (
            <AddFixedCostModal
              onAdd={handleAdd}
              onClose={() => setShowAddModal(false)}
            />
          )}
        </>
      )}

      {tab === 'patterns' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-400 mb-3 px-1">AIが検出した定期パターン</p>

          {/* 承認待ちカード例 */}
          <div className="card" style={{ borderLeft: '4px solid #E67E22' }}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-medium" style={{ color: '#1E3A5F' }}>週末外出</p>
                <p className="text-xs text-slate-400">約¥10,000/週 ・ 土日に集中</p>
              </div>
              <span className="text-xs px-2 py-0.5" style={{ backgroundColor: '#FDEBD0', color: '#E67E22', borderRadius: '20px' }}>
                承認待ち
              </span>
            </div>
            <div className="flex gap-2 mt-3">
              <button className="flex-1 py-2 text-xs font-medium text-white"
                style={{ backgroundColor: '#2E86C1', borderRadius: '8px' }}>
                承認する
              </button>
              <button className="flex-1 py-2 text-xs font-medium text-slate-500"
                style={{ backgroundColor: '#F0F0F0', borderRadius: '8px' }}>
                却下する
              </button>
            </div>
          </div>

          <div className="card" style={{ borderLeft: '4px solid #E67E22' }}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-medium" style={{ color: '#1E3A5F' }}>イオン買い物</p>
                <p className="text-xs text-slate-400">約¥5,000/週 ・ 木曜に集中</p>
              </div>
              <span className="text-xs px-2 py-0.5" style={{ backgroundColor: '#FDEBD0', color: '#E67E22', borderRadius: '20px' }}>
                承認待ち
              </span>
            </div>
            <div className="flex gap-2 mt-3">
              <button className="flex-1 py-2 text-xs font-medium text-white"
                style={{ backgroundColor: '#2E86C1', borderRadius: '8px' }}>
                承認する
              </button>
              <button className="flex-1 py-2 text-xs font-medium text-slate-500"
                style={{ backgroundColor: '#F0F0F0', borderRadius: '8px' }}>
                却下する
              </button>
            </div>
          </div>

          <div className="text-center py-4">
            <p className="text-xs text-slate-400">承認するとナレッジとして学習に活用されます</p>
          </div>
        </div>
      )}

      {tab === 'settings' && <FamilySettingsForm />}
    </div>
  );
}
