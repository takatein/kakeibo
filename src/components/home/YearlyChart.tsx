import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import { getYearlySummary } from '../../api/transactions';
import { formatCurrency } from '../../utils/format';
import type { MonthlySummary } from '../../types';

interface ChartDataPoint {
  month: string;
  label: string;
  income: number;
  expense: number;
  balance: number;
}

export function YearlyChart() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [year]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const summaries = await getYearlySummary(year);
      const chartData = summaries.map((s: MonthlySummary, i: number) => ({
        month: s.month,
        label: `${i + 1}月`,
        income: s.totalIncome,
        expense: s.totalExpense,
        balance: s.totalIncome - s.totalExpense,
      }));
      setData(chartData);
    } catch (err) {
      console.error('Failed to load yearly data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const totalIncome = data.reduce((sum, d) => sum + d.income, 0);
  const totalExpense = data.reduce((sum, d) => sum + d.expense, 0);
  const hasData = data.some(d => d.income > 0 || d.expense > 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white px-3 py-2 shadow-lg text-xs"
        style={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}>
        <p className="font-bold mb-1" style={{ color: '#1E3A5F' }}>{label}</p>
        {payload.map((entry: any) => (
          <p key={entry.dataKey} style={{ color: entry.color }}>
            {entry.dataKey === 'income' ? '収入' : '支出'}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="card">
      {/* ヘッダー: 年ナビゲーション */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold" style={{ color: '#1E3A5F' }}>年間収支</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setYear(y => y - 1)}
            className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600"
          >
            <LuChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium" style={{ color: '#1E3A5F' }}>
            {year}年
          </span>
          <button
            onClick={() => setYear(y => y + 1)}
            className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600"
          >
            <LuChevronRight size={16} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
          読み込み中...
        </div>
      ) : !hasData ? (
        <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
          {year}年のデータはまだありません
        </div>
      ) : (
        <>
          {/* グラフ */}
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => v >= 10000 ? `${Math.round(v / 10000)}万` : `${v}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#E5E7EB" />
              <Bar dataKey="income" name="収入" fill="#2E86C1" radius={[3, 3, 0, 0]} barSize={12} />
              <Bar dataKey="expense" name="支出" fill="#E67E22" radius={[3, 3, 0, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>

          {/* 凡例 + 年間合計 */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#2E86C1' }} />
                <span className="text-slate-500">収入</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#E67E22' }} />
                <span className="text-slate-500">支出</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400">年間収支</p>
              <p className="text-sm font-bold"
                style={{ color: totalIncome - totalExpense >= 0 ? '#059669' : '#DC2626' }}>
                {totalIncome - totalExpense >= 0 ? '+' : ''}{formatCurrency(totalIncome - totalExpense)}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
