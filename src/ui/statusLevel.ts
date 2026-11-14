// Рівні ризику й іконки (F7). Кожен рівень — своя іконка (F7-AC3).
export type StatusLevel = 'info' | 'ok' | 'warn' | 'danger' | 'pending' | 'deficit';

export const STATUS_ICON: Record<StatusLevel, string> = {
  info: 'ℹ',
  ok: '✔',
  warn: '⚠',
  danger: '✖',
  pending: '⏳',
  deficit: '⛔',
};
