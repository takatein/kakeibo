import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextInput } from './TextInput';
import { ConfirmDialog } from './ConfirmDialog';
import { submitInput, confirmInput } from '../../api/transactions';
import type { ConfirmItem } from '../../types';

type InputMode = 'text' | 'voice' | 'camera';

export function InputPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<InputMode>('text');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [items, setItems] = useState<ConfirmItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  const handleTextSubmit = async (text: string) => {
    const response = await submitInput({
      type: 'text',
      content: text,
      timestamp: new Date().toISOString(),
    });
    setSessionId(response.sessionId);
    setItems(response.items);
  };

  const handleConfirm = async (confirmedItems: ConfirmItem[]) => {
    if (!sessionId) return;
    setIsSaving(true);
    try {
      await confirmInput({
        sessionId,
        items: confirmedItems.map(item => ({
          tempId: item.tempId,
          amount: item.amount,
          category: item.category,
          shopName: item.shopName,
          date: item.date,
          memo: item.memo,
        })),
      });
      setItems([]);
      setSessionId(null);
      setSavedMessage('記録しました');
      setTimeout(() => setSavedMessage(''), 2000);
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setItems([]);
    setSessionId(null);
  };

  return (
    <div className="px-4 pb-4">
      {/* ヘッダー: タイトル + 閉じるボタン */}
      <header className="sticky top-0 z-40 pt-4 pb-2 backdrop-blur-sm"
        style={{ backgroundColor: 'rgba(245, 245, 245, 0.95)' }}>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold" style={{ color: '#1E3A5F' }}>支出を記録</h1>
          <button
            onClick={() => navigate('/')}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 text-lg"
          >
            ✕
          </button>
        </div>
      </header>

      {/* モードタブ: ピル型トグル */}
      <div className="flex gap-1 p-1 mb-5" style={{ backgroundColor: '#F0F0F0', borderRadius: '12px' }}>
        {([
          { key: 'camera' as InputMode, label: '撮影', icon: '📷' },
          { key: 'text' as InputMode, label: 'テキスト', icon: '💬' },
          { key: 'voice' as InputMode, label: '音声', icon: '🎤' },
        ]).map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-all"
            style={{
              borderRadius: '10px',
              backgroundColor: mode === key ? '#1E3A5F' : 'transparent',
              color: mode === key ? '#FFFFFF' : '#6B7280',
              boxShadow: mode === key ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            <span>{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* 成功メッセージ */}
      {savedMessage && (
        <div className="px-4 py-3 mb-4 text-center text-sm font-medium text-green-700"
          style={{ backgroundColor: '#D1FAE5', borderRadius: '12px' }}>
          {savedMessage}
        </div>
      )}

      {/* 確認画面 or 入力エリア */}
      {items.length > 0 ? (
        <ConfirmDialog
          items={items}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          isSaving={isSaving}
        />
      ) : (
        <>
          {mode === 'text' && <TextInput onSubmit={handleTextSubmit} />}

          {mode === 'voice' && (
            <div className="card text-center py-12">
              {/* マイクボタン — パルスリング */}
              <div className="relative inline-flex items-center justify-center mb-6">
                <div className="absolute w-24 h-24 rounded-full animate-ping opacity-10"
                  style={{ backgroundColor: '#2E86C1' }} />
                <div className="absolute w-20 h-20 rounded-full opacity-15"
                  style={{ backgroundColor: '#D6E4F0' }} />
                <button className="relative w-16 h-16 rounded-full flex items-center justify-center text-2xl text-white"
                  style={{ backgroundColor: '#1E3A5F' }}>
                  🎤
                </button>
              </div>
              <p className="text-slate-500 text-sm mb-2">ボタンを押して話してください</p>
              <p className="text-slate-400 text-xs">
                「居酒屋で4000円」のように話すと<br />AIが自動で分類します
              </p>
              <p className="text-xs mt-4 px-3 py-1.5 inline-block"
                style={{ backgroundColor: '#FDEBD0', color: '#E67E22', borderRadius: '20px' }}>
                Phase 2 で実装予定
              </p>
            </div>
          )}

          {mode === 'camera' && (
            <div className="card text-center py-12">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl"
                style={{ backgroundColor: '#D6E4F0' }}>
                📷
              </div>
              <p className="text-slate-500 text-sm mb-2">レシートを撮影してください</p>
              <p className="text-slate-400 text-xs">
                Bedrock Nova Pro でレシートから<br />金額・店名を自動読み取りします
              </p>
              <p className="text-xs mt-4 px-3 py-1.5 inline-block"
                style={{ backgroundColor: '#FDEBD0', color: '#E67E22', borderRadius: '20px' }}>
                Phase 2 で実装予定
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
