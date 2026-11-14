import type { ReactNode } from 'react';
import { OwnerBadge } from './OwnerBadge';

export interface PanelProps {
  title: string;
  /** 'F1'…'F8' */
  featureId: string;
  owner: string;
  /** Показати бейдж MOCK */
  mock?: boolean;
  id?: string;
  children?: ReactNode;
}

/** Секція з заголовком і власником. */
export function Panel({ title, featureId, owner, mock, id, children }: PanelProps) {
  const headingId = `${id ?? featureId}-title`;
  return (
    <section className="ui-panel" aria-labelledby={headingId} id={id}>
      <header>
        <h2 id={headingId}>{title}</h2>
        <span>
          {mock && <MockBadge />} <OwnerBadge featureId={featureId} owner={owner} />
        </span>
      </header>
      {children}
    </section>
  );
}

export function MockBadge({ label = 'MOCK' }: { label?: string }) {
  return <span className="ui-badge ui-badge--mock">{label}</span>;
}
