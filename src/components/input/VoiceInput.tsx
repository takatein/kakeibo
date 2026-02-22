import { useState, useRef, useEffect } from 'react';

interface VoiceInputProps {
  onSubmit: (text: string) => Promise<void>;
}

type RecordingState = 'idle' | 'listening' | 'processing';

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

export function VoiceInput({ onSubmit }: VoiceInputProps) {
  const [state, setState] = useState<RecordingState>('idle');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef<any>(null);

  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const startListening = () => {
    setError('');
    setTranscript('');
    setInterimTranscript('');

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'ja-JP';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setState('listening');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (final) {
        setTranscript(prev => prev + final);
        setInterimTranscript('');
      } else {
        setInterimTranscript(interim);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setState('idle');
      switch (event.error) {
        case 'no-speech':
          setError('音声が検出されませんでした。もう一度お試しください。');
          break;
        case 'not-allowed':
          setError('マイクの使用が許可されていません。ブラウザの設定を確認してください。');
          break;
        case 'network':
          setError('ネットワークエラーが発生しました。');
          break;
        default:
          setError('音声認識でエラーが発生しました。');
      }
    };

    recognition.onend = () => {
      setState('idle');
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const handleSubmit = async () => {
    if (!transcript.trim()) return;
    setState('processing');
    try {
      await onSubmit(transcript);
      setTranscript('');
    } catch (err) {
      console.error('Failed to process voice input:', err);
      setError('処理に失敗しました。');
    } finally {
      setState('idle');
    }
  };

  const handleReset = () => {
    setTranscript('');
    setInterimTranscript('');
    setError('');
  };

  if (!isSupported) {
    return (
      <div className="card text-center py-12">
        <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl"
          style={{ backgroundColor: '#D6E4F0' }}>
          🎤
        </div>
        <p className="text-slate-500 text-sm mb-2">お使いのブラウザは音声認識に対応していません</p>
        <p className="text-slate-400 text-xs">
          Chrome, Edge, Safari をご利用ください
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* マイクボタン */}
      <div className="card text-center py-8">
        <div className="relative inline-flex items-center justify-center mb-5">
          {/* パルスアニメーション（録音中） */}
          {state === 'listening' && (
            <>
              <div className="absolute w-28 h-28 rounded-full animate-ping opacity-10"
                style={{ backgroundColor: '#DC2626' }} />
              <div className="absolute w-24 h-24 rounded-full animate-pulse opacity-15"
                style={{ backgroundColor: '#DC2626' }} />
            </>
          )}

          <button
            onClick={state === 'listening' ? stopListening : startListening}
            disabled={state === 'processing'}
            className="relative w-20 h-20 rounded-full flex items-center justify-center text-3xl text-white transition-all active:scale-95"
            style={{
              backgroundColor: state === 'listening' ? '#DC2626' : '#1E3A5F',
              boxShadow: state === 'listening'
                ? '0 0 24px rgba(220, 38, 38, 0.4)'
                : '0 4px 12px rgba(30, 58, 95, 0.3)',
            }}
          >
            {state === 'processing' ? (
              <span className="inline-block w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : state === 'listening' ? (
              '⏹'
            ) : (
              '🎤'
            )}
          </button>
        </div>

        <p className="text-sm font-medium" style={{ color: '#1E3A5F' }}>
          {state === 'listening' ? '聞き取り中...' :
           state === 'processing' ? 'AIが分類中...' :
           'ボタンを押して話してください'}
        </p>
        <p className="text-slate-400 text-xs mt-1.5">
          「居酒屋で4000円」のように話すと<br />AIが自動で分類します
        </p>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="px-4 py-3 text-center text-sm text-red-600"
          style={{ backgroundColor: '#FEE2E2', borderRadius: '12px' }}>
          {error}
        </div>
      )}

      {/* 認識結果表示 */}
      {(transcript || interimTranscript) && (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">認識結果</span>
            {state === 'listening' && (
              <span className="flex items-center gap-1 text-xs" style={{ color: '#DC2626' }}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#DC2626' }} />
                録音中
              </span>
            )}
          </div>
          <p className="text-base leading-relaxed" style={{ color: '#1E3A5F' }}>
            {transcript}
            {interimTranscript && (
              <span className="text-slate-400">{interimTranscript}</span>
            )}
          </p>
        </div>
      )}

      {/* 操作ボタン（認識完了後） */}
      {transcript && state === 'idle' && (
        <div className="space-y-3">
          <button
            onClick={handleSubmit}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            AIに分類してもらう →
          </button>
          <div className="flex gap-2">
            <button
              onClick={startListening}
              className="btn-secondary flex-1 text-sm"
            >
              もう一度録音
            </button>
            <button
              onClick={handleReset}
              className="btn-secondary flex-1 text-sm"
            >
              クリア
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
