import { useState, useEffect } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { TransactionItem } from './TransactionItem';
import { EditTransactionModal } from './EditTransactionModal';
import { getTransactions, deleteTransaction, updateTransaction } from '../../api/transactions';
import { formatMonth, formatMonthJa } from '../../utils/format';
import type { Transaction } from '../../types';

export function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentMonth, setCurrentMonth] = useState(formatMonth(new Date()));
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, [currentMonth]);

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const txns = await getTransactions(currentMonth);
      setTransactions(txns);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (txnId: string) => {
    if (!confirm('この記録を削除しますか？')) return;
    await deleteTransaction(txnId);
    setTransactions(prev => prev.filter(t => t.txnId !== txnId));
  };

  const handleUpdate = async (txnId: string, updates: Partial<Transaction>) => {
    await updateTransaction(txnId, updates);
    setEditingTxn(null);
    await loadTransactions();
  };

  const navigateMonth = (direction: -1 | 1) => {
    const [y, m] = currentMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + direction, 1);
    setCurrentMonth(formatMonth(d));
  };

  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="px-4 pb-4">
      <PageHeader title="記録一覧" />

      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigateMonth(-1)} className="text-slate-400 p-2">←</button>
        <div className="text-center">
          <span className="text-lg font-bold">{formatMonthJa(currentMonth)}</span>
          <p className="text-xs text-slate-400">
            {transactions.length}件 ・ 合計 ¥{totalAmount.toLocaleString()}
          </p>
        </div>
        <button onClick={() => navigateMonth(1)} className="text-slate-400 p-2">→</button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400 text-sm">読み込み中...</div>
      ) : transactions.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-400 text-sm">この月の記録はありません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map((txn) => (
            <TransactionItem
              key={txn.txnId}
              transaction={txn}
              onEdit={() => setEditingTxn(txn)}
              onDelete={() => handleDelete(txn.txnId)}
            />
          ))}
        </div>
      )}

      {editingTxn && (
        <EditTransactionModal
          transaction={editingTxn}
          onSave={(updates) => handleUpdate(editingTxn.txnId, updates)}
          onClose={() => setEditingTxn(null)}
        />
      )}
    </div>
  );
}
