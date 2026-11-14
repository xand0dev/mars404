// Дизайн-система MARS::404 (F7). Правила — src/ui/README.md. Пропи лише додаються.
import type { ReactNode } from 'react';
import type { Evidence } from '../contracts';

const EVIDENCE_TEXT: Record<Evidence, string> = {
  verified: 'verified',
  assumption: 'assumption',
  mock: 'MOCK',
  pending: 'pending',
};

/** Статус джерела словом (SPEC §7.6). Колір — лише доповнення. */
export function EvidenceBadge({ status }: { status: Evidence }) {
  return (
    <span className={`ui-badge ui-badge--${status}`} aria-label={`Source status: ${EVIDENCE_TEXT[status]}`}>
      {EVIDENCE_TEXT[status]}
    </span>
  );
}

export interface ItemRowProps {
  /** Знак ліворуч (EvaSign), декоративний або з власною назвою. */
  sign?: ReactNode;
  title: ReactNode;
  /** Бейджі й короткі мітки. */
  meta?: ReactNode;
  /** Кнопки праворуч; на вузькому екрані переходять під назву. */
  actions?: ReactNode;
  className?: string;
}

/** Рядок списку: знак · назва · мітки · дії. Однаковий у всіх панелях. */
export function ItemRow({ sign, title, meta, actions, className }: ItemRowProps) {
  return (
    <li className={`ui-row${className ? ` ${className}` : ''}`}>
      {sign && <span className="ui-row__sign">{sign}</span>}
      <span className="ui-row__title">{title}</span>
      {meta && <span className="ui-row__meta">{meta}</span>}
      {actions && <span className="ui-row__actions">{actions}</span>}
    </li>
  );
}

export interface DisclosureProps {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

/** Розгортний блок на нативному <details>: клавіатура й екранні читалки працюють без скриптів. */
export function Disclosure({ summary, children, defaultOpen, className }: DisclosureProps) {
  return (
    <details className={`ui-disclosure${className ? ` ${className}` : ''}`} open={defaultOpen}>
      <summary>{summary}</summary>
      <div className="ui-disclosure__body">{children}</div>
    </details>
  );
}

export interface DataTableColumn {
  key: string;
  label: string;
  align?: 'start' | 'end';
}
export interface DataTableRow {
  id: string;
  cells: Record<string, ReactNode>;
}

/** Таблиця даних: підпис, заголовки з scope, горизонтальна прокрутка лише всередині блоку. */
export function DataTable({ caption, columns, rows }: { caption: string; columns: DataTableColumn[]; rows: DataTableRow[] }) {
  return (
    <div className="ui-table-wrap">
      <table className="ui-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={c.align === 'end' ? 'ui-table__cell--end' : undefined}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              {columns.map((c) => (
                <td key={c.key} className={c.align === 'end' ? 'ui-table__cell--end' : undefined}>
                  {r.cells[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
