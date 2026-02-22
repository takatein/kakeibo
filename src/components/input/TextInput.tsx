import { useState } from 'react';

interface TextInputProps {
  onSubmit: (text: string) => Promise<void>;
}

const QUICK_EXAMPLES = [
  '昨日イオンで3000円くらい使った',
  'ファミレスでランチ 1200円',
  '飲み会 4000円',
  'コストコ 8500円',
  '子供の靴 2980円',
  '昨日タクシー 2300円',
];

export function TextInput({ onSubmit }: TextInputProps) {
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (input: string) => {
    if (!input.trim()) return;
    setIsProcessing(true);
    try {
      await onSubmit(input);
      setText('');
    } catch (err) {
      console.error('Categorization failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* テキスト入力エリア */}
      <div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="例：昨日イオンで3000円くらい使った"
          className="w-full resize-none border border-slate-200 text-base placeholder:text-slate-400 focus:outline-none"
          style={{
            borderRadius: '16px',
            padding: '16px',
            height: '120px',
            backgroundColor: '#FFFFFF',
            boxShadow: text ? '0 0 0 2px #2E86C1' : 'none',
            transition: 'box-shadow 0.15s ease',
          }}
          disabled={isProcessing}
        />
        <button
          onClick={() => handleSubmit(text)}
          disabled={!text.trim() || isProcessing}
          className="btn-primary w-full mt-3 flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              AIが分類中...
            </>
          ) : (
            'AIに分類してもらう →'
          )}
        </button>
      </div>

      {/* 入力例チップ */}
      <div>
        <p className="text-xs text-slate-400 mb-2 px-1">タップで入力例をお試し</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_EXAMPLES.map((example) => (
            <button
              key={example}
              onClick={() => handleSubmit(example)}
              disabled={isProcessing}
              className="text-xs text-slate-600 hover:bg-white transition-colors"
              style={{
                backgroundColor: 'rgba(255,255,255,0.8)',
                borderRadius: '20px',
                padding: '6px 14px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
