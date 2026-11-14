import { useId, type ReactNode } from 'react';
import { OwnerBadge } from './OwnerBadge';
import { usePanelGroup } from './panelGroup';

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

/**
 * Секція з заголовком і власником. У групі (PanelGroupContext, права колонка Shell) заголовок —
 * кнопка з aria-expanded; тіло ховається класом, а не розмонтовується (стан фічі зберігається).
 */
export function Panel({ title, featureId, owner, mock, id, children }: PanelProps) {
  const headingId = `${id ?? featureId}-title`;
  const bodyId = `${useId()}-body`;
  const group = usePanelGroup();
  const open = group ? group.isOpen(title) : true;
  const badges = (
    <span className="ui-panel__badges">
      {mock && <MockBadge />}
      <OwnerBadge featureId={featureId} owner={owner} />
    </span>
  );

  return (
    <section className={`ui-panel${group ? ' ui-panel--collapsible' : ''}${open ? '' : ' ui-panel--collapsed'}`} aria-labelledby={headingId} id={id}>
      <header className="ui-panel__head">
        {group ? (
          <h2 id={headingId} className="ui-panel__title">
            <button type="button" className="ui-panel__toggle" aria-expanded={open} aria-controls={bodyId} onClick={() => group.toggle(title)}>
              {title}
            </button>
          </h2>
        ) : (
          <h2 id={headingId} className="ui-panel__title">
            {title}
          </h2>
        )}
        {badges}
      </header>
      {group ? (
        <div id={bodyId} className="ui-panel__body">
          {children}
        </div>
      ) : (
        children
      )}
    </section>
  );
}

export function MockBadge({ label = 'MOCK' }: { label?: string }) {
  return <span className="ui-badge ui-badge--mock">{label}</span>;
}
