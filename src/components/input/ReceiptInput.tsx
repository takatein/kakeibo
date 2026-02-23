import { useState, useRef } from 'react';
import { LuCamera, LuImage, LuMaximize, LuSun, LuRuler } from 'react-icons/lu';
import type { ConfirmItem, Category } from '../../types';
import { generateId } from '../../utils/id';
import { formatDate } from '../../utils/format';

interface ReceiptInputProps {
  onResult: (items: ConfirmItem[], sessionId: string) => void;
}

type CaptureState = 'idle' | 'preview' | 'processing';

/** レシートテキストから金額・店名を抽出（ルールベースOCRモック） */
function parseReceiptText(text: string): { shopName?: string; amount: number; items: { name: string; price: number }[] } {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const items: { name: string; price: number }[] = [];
  let shopName: string | undefined;
  let totalAmount = 0;

  // 最初の行を店名として扱う
  if (lines.length > 0 && !/\d/.test(lines[0])) {
    shopName = lines[0];
  }

  // 合計行を探す
  for (const line of lines) {
    const totalMatch = line.match(/(?:合計|小計|お会計|計)\s*[¥￥]?\s*([\d,]+)/);
    if (totalMatch) {
      totalAmount = parseInt(totalMatch[1].replace(/,/g, ''), 10);
    }

    // 商品行のパターン
    const itemMatch = line.match(/(.+?)\s+[¥￥]?\s*([\d,]+)$/);
    if (itemMatch && !line.match(/合計|小計|お会計|税|消費/)) {
      items.push({
        name: itemMatch[1].trim(),
        price: parseInt(itemMatch[2].replace(/,/g, ''), 10),
      });
    }
  }

  // 合計が見つからなければ各商品の合計
  if (!totalAmount && items.length > 0) {
    totalAmount = items.reduce((sum, item) => sum + item.price, 0);
  }

  return { shopName, amount: totalAmount, items };
}

/** 店名からカテゴリを推定 */
function guessCategory(shopName?: string): { category: Category; label: string } {
  if (!shopName) return { category: 'other', label: 'その他' };
  const name = shopName.toLowerCase();

  const rules: { keywords: string[]; category: Category; label: string }[] = [
    { keywords: ['イオン', 'ライフ', 'ヨーカドー', '西友', 'まいばすけっと', 'コストコ', 'スーパー', 'OK', 'マルエツ', 'サミット'], category: 'food_home', label: '食費（自炊）' },
    { keywords: ['マクドナルド', 'マック', 'サイゼリア', 'ガスト', 'デニーズ', '吉野家', 'すき家', '松屋', 'ファミレス', 'CoCo'], category: 'food_restaurant', label: '外食' },
    { keywords: ['ドラッグ', 'マツモトキヨシ', 'ウエルシア', 'ツルハ', 'サンドラッグ', 'スギ薬局'], category: 'daily_goods', label: '日用品' },
    { keywords: ['病院', 'クリニック', '薬局', '医院', '歯科'], category: 'medical', label: '医療費' },
    { keywords: ['トイザらス', 'ベビー', '西松屋', 'アカチャンホンポ'], category: 'children', label: '子供関連' },
    { keywords: ['GS', 'ガソリン', 'ENEOS', '出光', 'シェル', 'コスモ'], category: 'car', label: '車関連' },
  ];

  for (const rule of rules) {
    if (rule.keywords.some(kw => name.includes(kw.toLowerCase()))) {
      return { category: rule.category, label: rule.label };
    }
  }

  return { category: 'other', label: 'その他' };
}

export function ReceiptInput({ onResult }: ReceiptInputProps) {
  const [state, setState] = useState<CaptureState>('idle');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('画像ファイルを選択してください。');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('ファイルサイズは10MB以下にしてください。');
      return;
    }

    setError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
      setState('preview');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // inputをリセット（同じファイルを再選択可能に）
    e.target.value = '';
  };

  const handleAnalyze = async () => {
    setState('processing');

    // 実際のOCR処理をシミュレート（Bedrock Vision接続時に差し替え）
    await new Promise(resolve => setTimeout(resolve, 1500));

    // デモ用のモックOCR結果
    const mockReceiptData = {
      shopName: 'イオン 品川シーサイド店',
      amount: 3280,
      items: [
        { name: '鶏むね肉 国産', price: 498 },
        { name: 'キャベツ 1玉', price: 198 },
        { name: '牛乳 1L', price: 228 },
        { name: 'たまご 10個', price: 258 },
        { name: '食パン 6枚切', price: 168 },
        { name: 'お米 5kg', price: 1930 },
      ],
    };

    const { category, label } = guessCategory(mockReceiptData.shopName);
    const today = formatDate(new Date());
    const sessionId = `session_${generateId()}`;

    const confirmItems: ConfirmItem[] = [{
      tempId: generateId(),
      amount: mockReceiptData.amount,
      category,
      categoryLabel: label,
      shopName: mockReceiptData.shopName,
      date: today,
      memo: `レシート読取: ${mockReceiptData.items.map(i => i.name).join(', ')}`,
      confidence: 0.8,
      alternativeCategories: ([
        { category: 'daily_goods' as Category, label: '日用品' },
        { category: 'other' as Category, label: 'その他' },
      ] as { category: Category; label: string }[]).filter(alt => alt.category !== category),
    }];

    setState('idle');
    onResult(confirmItems, sessionId);
  };

  const handleReset = () => {
    setState('idle');
    setImagePreview(null);
    setError('');
  };

  // 隠しinput要素
  const hiddenInputs = (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
    </>
  );

  // プレビュー & 解析画面
  if (state === 'preview' || state === 'processing') {
    return (
      <div className="space-y-4">
        {hiddenInputs}

        {/* プレビュー画像 */}
        <div className="card overflow-hidden p-0">
          {imagePreview && (
            <img
              src={imagePreview}
              alt="レシートプレビュー"
              className="w-full max-h-80 object-contain"
              style={{ backgroundColor: '#F8F8F8' }}
            />
          )}
        </div>

        {/* 操作ボタン */}
        <div className="space-y-3">
          <button
            onClick={handleAnalyze}
            disabled={state === 'processing'}
            className="btn-primary w-full flex items-center justify-center gap-2 text-base"
            style={{ padding: '14px 24px' }}
          >
            {state === 'processing' ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                AI読み取り中...
              </>
            ) : (
              'AIに読み取ってもらう →'
            )}
          </button>
          {state !== 'processing' && (
            <div className="flex gap-2">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="btn-secondary flex-1 text-sm"
              >
                撮り直す
              </button>
              <button
                onClick={handleReset}
                className="btn-secondary flex-1 text-sm"
              >
                キャンセル
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 初期画面（撮影 or ギャラリー選択）
  return (
    <div className="space-y-4">
      {hiddenInputs}

      {/* エラー表示 */}
      {error && (
        <div className="px-4 py-3 text-center text-sm text-red-600"
          style={{ backgroundColor: '#FEE2E2', borderRadius: '12px' }}>
          {error}
        </div>
      )}

      {/* メインカメラボタン */}
      <div className="card text-center py-8">
        <button
          onClick={() => cameraInputRef.current?.click()}
          className="relative inline-flex items-center justify-center mb-5"
        >
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl text-white transition-all active:scale-95"
            style={{
              backgroundColor: '#1E3A5F',
              boxShadow: '0 4px 12px rgba(30, 58, 95, 0.3)',
            }}
          >
            <LuCamera size={28} />
          </div>
        </button>
        <p className="text-sm font-medium" style={{ color: '#1E3A5F' }}>
          レシートを撮影
        </p>
        <p className="text-slate-400 text-xs mt-1.5">
          AIが金額・店名を自動で読み取ります
        </p>
      </div>

      {/* ギャラリーから選択 */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="btn-secondary w-full flex items-center justify-center gap-2"
      >
        <LuImage size={16} />
        ギャラリーから選択
      </button>

      {/* 使い方ヒント */}
      <div className="card" style={{ backgroundColor: '#F0F7FF' }}>
        <h4 className="text-xs font-bold mb-2" style={{ color: '#1E3A5F' }}>きれいに撮るコツ</h4>
        <ul className="space-y-1.5 text-xs text-slate-500">
          <li className="flex items-start gap-2">
            <LuMaximize size={14} className="shrink-0 mt-0.5" />
            <span>レシート全体が写るように撮影</span>
          </li>
          <li className="flex items-start gap-2">
            <LuSun size={14} className="shrink-0 mt-0.5" />
            <span>明るい場所で、影がかからないように</span>
          </li>
          <li className="flex items-start gap-2">
            <LuRuler size={14} className="shrink-0 mt-0.5" />
            <span>平らな場所に置いてまっすぐ撮影</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
