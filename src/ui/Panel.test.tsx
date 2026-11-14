import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Panel } from './Panel';
import { PanelGroupContext } from './panelGroup';

function Group({ initial }: { initial: string[] }) {
  const [open, setOpen] = useState(new Set(initial));
  const group = {
    isOpen: (t: string) => open.has(t),
    toggle: (t: string) =>
      setOpen((s) => {
        const n = new Set(s);
        if (n.has(t)) n.delete(t);
        else n.add(t);
        return n;
      }),
  };
  return (
    <PanelGroupContext.Provider value={group}>
      <Panel title="Layers" featureId="F3" owner="Максим" mock>
        <button type="button">Inside layers</button>
      </Panel>
    </PanelGroupContext.Provider>
  );
}

describe('Panel — заголовок, бейджі, згортання в групі (T22–T23)', () => {
  it('поза групою — звичайний заголовок, без кнопки; бейджі MOCK і власника', () => {
    render(
      <Panel title="Route" featureId="F4" owner="Влад" mock>
        body
      </Panel>,
    );
    const region = screen.getByRole('region', { name: 'Route' });
    expect(region).not.toHaveClass('ui-panel--collapsible');
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('MOCK')).toHaveClass('ui-badge', 'ui-badge--mock');
    expect(screen.getByText('F4 · Влад')).toHaveClass('ui-badge', 'ui-badge--owner');
  });

  it('у групі заголовок — кнопка з aria-expanded; назва регіону та сама', () => {
    render(<Group initial={[]} />);
    const region = screen.getByRole('region', { name: 'Layers' });
    const btn = screen.getByRole('button', { name: 'Layers' });
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    expect(region).toHaveClass('ui-panel--collapsed');
    expect(document.getElementById(btn.getAttribute('aria-controls') as string)).toContainElement(screen.getByRole('button', { name: 'Inside layers' }));
  });

  it('клік розгортає і згортає; вміст не розмонтовується', () => {
    render(<Group initial={['Layers']} />);
    const btn = screen.getByRole('button', { name: 'Layers' });
    const inner = screen.getByRole('button', { name: 'Inside layers' });
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('region', { name: 'Layers' })).toHaveClass('ui-panel--collapsed');
    expect(inner).toBeInTheDocument();
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'true');
  });
});
