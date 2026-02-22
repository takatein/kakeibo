import { useState } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { TextInput } from './TextInput';
import { ConfirmDialog } from './ConfirmDialog';
import { categorizeWithAi, saveTransaction } from '../../api/transactions';
import type { AiCategorizationResult, InputMethod } from '../../types';

type InputMode = 'text' | 'voice' | 'receipt';

export function InputPage() {
  const [mode, setMode] = useState<InputMode>('text');
  const [result, setResult] = useState<AiCategorizationResult | null>(null);
  const [inputMethod, setInputMethod] = useState<InputMethod>('text');
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  const handleTextSubmit = async (text: string) => {
    const aiResult = await categorizeWithAi(text);
    setResult(aiResult);
    setInputMethod('text');
  };

  const handleConfirm = async (confirmed: AiCategorizationResult) => {
    setIsSaving(true);
    try {
      await saveTransaction({
        userId: 'demo-user',
        date: confirmed.date,
        amount: confirmed.amount,
        category: confirmed.category,
        storeName: confirmed.storeName,
        memo: confirmed.memo,
        inputMethod,
        inputBy: 'husband',
        isFixed: false,
      });
      setResult(null);
      setSavedMessage('記録しました');
      setTimeout(() => setSavedMessage(''), 2000);
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setResult(null);
  };

  return (
    <div className="px-4 pb-4">
      <PageHeader title="支出を記録" subtitle="しゃべる・撮る・雑に書く" />

      {/* モード切替タブ */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4">
        {([
          { key: 'text', label: 'テキスト', icon: '✏️' },
          { key: 'voice', label: '音声', icon: '🎤' },
          { key: 'receipt', label: 'レシート', icon: '📷' },
        ] as const).map(({ key, label, icon }) => (
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

      {/* 確認ダイアログ */}
      {result ? (
        <ConfirmDialog
          result={result}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          isSaving={isSaving}
        />
      ) : (
        <>
          {/* テキスト入力 */}
          {mode === 'text' && <TextInput onSubmit={handleTextSubmit} />}

          {/* 音声入力 (Phase 2) */}
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

          {/* レシート撮影 (Phase 2) */}
          {mode === 'receipt' && (
            <div className="card text-center py-12">
              <p className="text-4xl mb-3">📷</p>
              <p className="text-slate-500 text-sm">
                レシート撮影は Phase 2 で実装予定です
              </p>
              <p className="text-slate-400 text-xs mt-2">
                Bedrock Nova Pro (Vision) を使用して<br />
                レシートから金額・店名を自動読み取りします
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
