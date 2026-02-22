import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTransactions } from '../../api/transactions';
import { CATEGORY_LABELS, CATEGORY_COLORS, type Transaction } from '../../types';
import { formatCurrency, formatDateJa } from '../../utils/format';

interface RecentTransactionsProps {
  month: string;
}

export function RecentTransactions({ month }: RecentTransactionsProps) {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    getTransactions(month).then(txns => setTransactions(txns.slice(0, 5)));
  }, [month]);

  if (transactions.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-slate-400 text-sm">まだ記録がありません</p>
        <button
          onClick={() => navigate('/input')}
          className="btn-primary mt-3 text-sm"
        >
          最初の支出を記録する
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-700">最近の記録</h3>
        <button
          onClick={() => navigate('/transactions')}
          className="text-xs text-primary-600 font-medium"
        >
          すべて見る →
        </button>
      </div>

      <div className="space-y-2">
        {transactions.map((txn) => (
          <div
            key={txn.txnId}
            className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ backgroundColor: CATEGORY_COLORS[txn.category] }}
            >
              {CATEGORY_LABELS[txn.category].charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 truncate">
                {txn.shopName || txn.memo || CATEGORY_LABELS[txn.category]}
              </p>
              <p className="text-xs text-slate-400">
                {formatDateJa(txn.date)} ・ {CATEGORY_LABELS[txn.category]}
                {txn.isFixed && ' ・ 固定'}
              </p>
            </div>
            <p className="text-sm font-bold text-slate-700 shrink-0">
              {formatCurrency(txn.amount)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
