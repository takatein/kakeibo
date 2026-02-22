import { useState } from 'react';

interface TextInputProps {
  onSubmit: (text: string) => Promise<void>;
}

const QUICK_EXAMPLES = [
  'イオンで3240円',
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
      <div className="card">
        <label className="text-sm font-medium text-slate-700 mb-2 block">
          なんでも雑に書いてOK
        </label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="例: 今日イオンで3240円の買い物した"
          className="input-field resize-none h-24"
          disabled={isProcessing}
        />
        <button
          onClick={() => handleSubmit(text)}
          disabled={!text.trim() || isProcessing}
          className="btn-primary w-full mt-3"
        >
          {isProcessing ? 'AIが分類中...' : 'AIに分類してもらう'}
        </button>
      </div>

      <div>
        <p className="text-xs text-slate-400 mb-2 px-1">タップで入力例をお試し</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_EXAMPLES.map((example) => (
            <button
              key={example}
              onClick={() => handleSubmit(example)}
              disabled={isProcessing}
              className="bg-white border border-slate-200 rounded-full px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
