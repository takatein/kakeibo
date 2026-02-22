import { useState } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { TextInput } from './TextInput';
import { ConfirmDialog } from './ConfirmDialog';
import { submitInput, confirmInput } from '../../api/transactions';
import type { ConfirmItem } from '../../types';

type InputMode = 'text' | 'voice' | 'camera';

export function InputPage() {
  const [mode, setMode] = useState<InputMode>('text');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [items, setItems] = useState<ConfirmItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  /** 設計書 §9: POST /input */
  const handleTextSubmit = async (text: string) => {
    const response = await submitInput({
      type: 'text',
      content: text,
      timestamp: new Date().toISOString(),
    });
    setSessionId(response.sessionId);
    setItems(response.items);
  };

  /** 設計書 §9: POST /input/confirm */
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
      <PageHeader title="支出を記録" subtitle="しゃべる・撮る・雑に書く" />

      {/* 設計書 §10-3: [📷] [💬] [🎤] モードタブ */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4">
        {([
          { key: 'camera' as InputMode, label: 'レシート', icon: '📷' },
          { key: 'text' as InputMode, label: 'テキスト', icon: '💬' },
          { key: 'voice' as InputMode, label: '音声', icon: '🎤' },
        ]).map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              mode === key
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-slate-500'
            }`}
          >
            <span>{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* 成功メッセージ */}
      {savedMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 mb-4 text-center text-sm font-medium animate-pulse">
          {savedMessage}
        </div>
      )}

      {/* 設計書 §10-3: 確認画面 */}
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
              <p className="text-4xl mb-3">🎤</p>
              <p className="text-slate-500 text-sm">
                音声入力は Phase 2 で実装予定です
              </p>
              <p className="text-slate-400 text-xs mt-2">
                Web Speech API を使用して<br />
                「居酒屋で4000円」のような音声を認識します
              </p>
            </div>
          )}

          {mode === 'camera' && (
            <div className="card text-center py-12">
              <p className="text-4xl mb-3">📷</p>
              <p className="text-slate-500 text-sm">
                レシート撮影は Phase 2 で実装予定です
              </p>
              <p className="text-slate-400 text-xs mt-2">
                Bedrock Nova Pro (マルチモーダル) を使用して<br />
                レシートから金額・店名を自動読み取りします
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
