/** 金額を日本円でフォーマット */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** 金額を符号付きでフォーマット */
export function formatSignedCurrency(amount: number): string {
  const prefix = amount >= 0 ? '+' : '';
  return prefix + formatCurrency(amount);
}

/** 日付をYYYY-MM-DD形式でフォーマット */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 日付をYYYY-MM形式でフォーマット */
export function formatMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** 日付を日本語表示（M月D日） */
export function formatDateJa(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

/** 月を日本語表示（YYYY年M月） */
export function formatMonthJa(monthStr: string): string {
  const [y, m] = monthStr.split('-');
  return `${y}年${parseInt(m)}月`;
}

/** パーセンテージ表示 */
export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

/** 数値を簡略表示（万円単位） */
export function formatManYen(amount: number): string {
  if (Math.abs(amount) >= 10000) {
    return `${Math.round(amount / 10000)}万円`;
  }
  return formatCurrency(amount);
}
