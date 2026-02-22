import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export function LoginScreen() {
  const { login, signup } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (isSignup) {
        await signup(email, password, name);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '認証に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-b from-primary-50 to-slate-50">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">💰</div>
          <h1 className="text-2xl font-bold text-slate-900">Kakeibo AI</h1>
          <p className="text-sm text-slate-500 mt-2">
            きっちり記録しない。<br />
            なんとなく把握できる。それでいい。
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card space-y-4">
          <h2 className="text-lg font-bold text-center">
            {isSignup ? 'アカウント作成' : 'ログイン'}
          </h2>

          {isSignup && (
            <input
              type="text"
              placeholder="お名前"
              value={name}
              onChange={e => setName(e.target.value)}
              className="input-field"
              required
            />
          )}

          <input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="input-field"
            required
          />

          <input
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="input-field"
            required
            minLength={6}
          />

          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full"
          >
            {isSubmitting
              ? '処理中...'
              : isSignup
                ? 'アカウント作成'
                : 'ログイン'}
          </button>

          <p className="text-center text-sm text-slate-500">
            {isSignup ? 'すでにアカウントをお持ちの方は' : 'アカウントをお持ちでない方は'}
            <button
              type="button"
              onClick={() => {
                setIsSignup(!isSignup);
                setError('');
              }}
              className="text-primary-600 font-medium ml-1"
            >
              {isSignup ? 'ログイン' : '新規登録'}
            </button>
          </p>
        </form>

        {/* Demo login */}
        <div className="mt-4 text-center">
          <button
            onClick={() => login('demo@example.com', 'demo')}
            className="text-sm text-slate-400 underline"
          >
            デモモードで始める
          </button>
        </div>
      </div>
    </div>
  );
}
