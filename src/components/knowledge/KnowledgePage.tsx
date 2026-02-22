import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuChevronLeft, LuBrain, LuPlus } from 'react-icons/lu';
import { PageHeader } from '../layout/PageHeader';
import { FixedCostList } from './FixedCostList';
import { AddFixedCostModal } from './AddFixedCostModal';
import { FamilySettingsForm } from './FamilySettingsForm';
import { getFixedCosts, addFixedCost, updateFixedCost, deleteFixedCost } from '../../api/fixed-costs';
import {
  getPatterns, approvePattern, rejectPattern, deletePattern,
  runPatternAnalysis, getContextRules,
} from '../../api/knowledge';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '../../types';
import { formatCurrency } from '../../utils/format';
import type { FixedCost, PatternKnowledge, ContextKnowledge, Category } from '../../types';

type Tab = 'fixed' | 'patterns' | 'settings';

export function KnowledgePage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('fixed');
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // パターン関連
  const [patterns, setPatterns] = useState<PatternKnowledge[]>([]);
  const [contextRules, setContextRules] = useState<ContextKnowledge>({ shopToCategory: {}, keywordToCategory: {} });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisMessage, setAnalysisMessage] = useState('');

  useEffect(() => {
    loadFixedCosts();
    loadPatterns();
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

  const loadPatterns = async () => {
    try {
      const [p, ctx] = await Promise.all([
        getPatterns(),
        getContextRules(),
      ]);
      setPatterns(p);
      setContextRules(ctx);
    } catch (err) {
      console.error('Failed to load patterns:', err);
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

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisMessage('');
    try {
      const result = await runPatternAnalysis();
      await loadPatterns();
      if (result.newPatterns > 0) {
        setAnalysisMessage(`${result.newPatterns}件の新しいパターンを検出しました`);
      } else {
        setAnalysisMessage('新しいパターンは見つかりませんでした。記録が増えると検出精度が上がります。');
      }
      setTimeout(() => setAnalysisMessage(''), 4000);
    } catch (err) {
      console.error('Pattern analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApprove = async (patternId: string) => {
    await approvePattern(patternId);
    await loadPatterns();
  };

  const handleReject = async (patternId: string) => {
    await rejectPattern(patternId);
    await loadPatterns();
  };

  const handleDeletePattern = async (patternId: string) => {
    await deletePattern(patternId);
    await loadPatterns();
  };

  const pendingPatterns = patterns.filter(p => p.status === 'pending');
  const approvedPatterns = patterns.filter(p => p.status === 'approved');
  const shopRuleCount = Object.keys(contextRules.shopToCategory).length;

  return (
    <div className="px-4 pb-4 relative min-h-screen">
      <PageHeader
        title="ナレッジ管理"
        leftAction={
          <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-600">
            <LuChevronLeft size={20} />
          </button>
        }
      />

      {/* タブ */}
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
            {key === 'patterns' && pendingPatterns.length > 0 && (
              <span className="absolute -top-1 right-2 w-4 h-4 text-[10px] text-white rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#E67E22' }}>
                {pendingPatterns.length}
              </span>
            )}
            {tab === key && (
              <div className="absolute bottom-0 left-4 right-4 h-0.5" style={{ backgroundColor: '#2E86C1' }} />
            )}
          </button>
        ))}
      </div>

      {/* 固定費タブ */}
      {tab === 'fixed' && (
        <>
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

          <button
            onClick={() => setShowAddModal(true)}
            className="fixed bottom-24 right-6 w-14 h-14 rounded-full text-white text-2xl flex items-center justify-center z-40"
            style={{
              backgroundColor: '#1E3A5F',
              boxShadow: '0 4px 12px rgba(30, 58, 95, 0.4)',
            }}
          >
            <LuPlus size={24} />
          </button>

          {pendingPatterns.length > 0 && (
            <button
              onClick={() => setTab('patterns')}
              className="w-full mt-4 py-3 px-4 text-left text-sm font-medium flex items-center justify-between"
              style={{
                backgroundColor: '#FDEBD0',
                borderRadius: '12px',
                color: '#E67E22',
              }}
            >
              <span>AIパターン (承認待ち {pendingPatterns.length}件)</span>
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

      {/* AIパターンタブ */}
      {tab === 'patterns' && (
        <div className="space-y-4">
          {/* 分析実行ボタン */}
          <button
            onClick={handleRunAnalysis}
            disabled={isAnalyzing}
            className="w-full py-3 text-sm font-medium flex items-center justify-center gap-2"
            style={{
              backgroundColor: '#1E3A5F',
              color: '#FFFFFF',
              borderRadius: '12px',
            }}
          >
            {isAnalyzing ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                分析中...
              </>
            ) : (
              '取引履歴からパターンを分析'
            )}
          </button>

          {analysisMessage && (
            <div className="px-4 py-3 text-center text-sm font-medium"
              style={{ backgroundColor: '#D1FAE5', color: '#059669', borderRadius: '12px' }}>
              {analysisMessage}
            </div>
          )}

          {/* 承認待ちパターン */}
          {pendingPatterns.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 mb-2 px-1">承認待ち ({pendingPatterns.length}件)</p>
              <div className="space-y-3">
                {pendingPatterns.map(pattern => (
                  <PatternCard
                    key={pattern.patternId}
                    pattern={pattern}
                    onApprove={() => handleApprove(pattern.patternId)}
                    onReject={() => handleReject(pattern.patternId)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 承認済みパターン */}
          {approvedPatterns.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 mb-2 px-1">承認済み ({approvedPatterns.length}件)</p>
              <div className="space-y-3">
                {approvedPatterns.map(pattern => (
                  <div key={pattern.patternId} className="card" style={{ borderLeft: '4px solid #059669' }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium" style={{ color: '#1E3A5F' }}>
                          {pattern.description}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          約{formatCurrency(pattern.averageAmount)}/{pattern.frequency === 'weekly' ? '週' : '月'}
                          {pattern.dayOfWeek && ` ・ ${pattern.dayOfWeek.join('・')}曜`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium px-2 py-0.5"
                          style={{
                            borderRadius: '20px',
                            backgroundColor: CATEGORY_COLORS[pattern.category] + '20',
                            color: CATEGORY_COLORS[pattern.category],
                          }}>
                          {CATEGORY_LABELS[pattern.category]}
                        </span>
                        <button
                          onClick={() => handleDeletePattern(pattern.patternId)}
                          className="text-slate-300 hover:text-red-400 text-sm"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* コンテキストルール（学習済み店舗→カテゴリ） */}
          {shopRuleCount > 0 && (
            <div>
              <p className="text-xs text-slate-400 mb-2 px-1">学習済みルール ({shopRuleCount}件)</p>
              <div className="card">
                <div className="space-y-2">
                  {Object.entries(contextRules.shopToCategory).map(([shop, category]) => (
                    <div key={shop} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                      <span className="text-sm" style={{ color: '#1E3A5F' }}>{shop}</span>
                      <span className="text-[10px] font-medium px-2 py-0.5"
                        style={{
                          borderRadius: '20px',
                          backgroundColor: CATEGORY_COLORS[category as Category] + '20',
                          color: CATEGORY_COLORS[category as Category],
                        }}>
                        {CATEGORY_LABELS[category as Category]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 空状態 */}
          {pendingPatterns.length === 0 && approvedPatterns.length === 0 && shopRuleCount === 0 && (
            <div className="card text-center py-10">
              <div className="text-3xl mb-3"><LuBrain size={32} color="#1E3A5F" /></div>
              <p className="text-sm text-slate-500 mb-1">まだパターンがありません</p>
              <p className="text-xs text-slate-400">
                支出を記録していくと、AIが自動的に<br />
                買い物パターンを学習します
              </p>
            </div>
          )}

          <div className="text-center py-2">
            <p className="text-xs text-slate-400">承認するとナレッジとして分類精度の向上に活用されます</p>
          </div>
        </div>
      )}

      {/* 家族設定タブ */}
      {tab === 'settings' && <FamilySettingsForm />}
    </div>
  );
}

/** パターンカード（承認待ち） */
function PatternCard({
  pattern,
  onApprove,
  onReject,
}: {
  pattern: PatternKnowledge;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="card" style={{ borderLeft: '4px solid #E67E22' }}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-medium" style={{ color: '#1E3A5F' }}>
            {pattern.description}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            約{formatCurrency(pattern.averageAmount)}/{pattern.frequency === 'weekly' ? '週' : '月'}
            {pattern.dayOfWeek && ` ・ ${pattern.dayOfWeek.join('・')}曜に集中`}
            {pattern.countPerWeek && ` ・ 週${pattern.countPerWeek}回`}
          </p>
        </div>
        <span className="text-xs px-2 py-0.5 shrink-0"
          style={{ backgroundColor: '#FDEBD0', color: '#E67E22', borderRadius: '20px' }}>
          承認待ち
        </span>
      </div>

      {/* カテゴリ表示 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-medium px-2 py-0.5 text-white"
          style={{
            borderRadius: '20px',
            backgroundColor: CATEGORY_COLORS[pattern.category],
          }}>
          {CATEGORY_LABELS[pattern.category]}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onApprove}
          className="flex-1 py-2 text-xs font-medium text-white"
          style={{ backgroundColor: '#2E86C1', borderRadius: '8px' }}
        >
          承認する
        </button>
        <button
          onClick={onReject}
          className="flex-1 py-2 text-xs font-medium text-slate-500"
          style={{ backgroundColor: '#F0F0F0', borderRadius: '8px' }}
        >
          却下する
        </button>
      </div>
    </div>
  );
}
