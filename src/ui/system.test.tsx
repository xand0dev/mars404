import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DataTable, Disclosure, EvidenceBadge, ItemRow } from './system';

// Дизайн-система MARS::404 (src/ui/README.md): спільні будівельні блоки для всіх панелей.
describe('EvidenceBadge — статус джерела словом, колір лише доповнює (SPEC §7.6)', () => {
  it.each([
    ['verified', 'verified'],
    ['assumption', 'assumption'],
    ['pending', 'pending'],
  ] as const)('%s → «%s»', (status, text) => {
    const { container } = render(<EvidenceBadge status={status} />);
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass('ui-badge', `ui-badge--${status}`);
  });

  it('mock → «MOCK» з доступною назвою «Source status: MOCK»', () => {
    render(<EvidenceBadge status="mock" />);
    expect(screen.getByLabelText('Source status: MOCK')).toHaveTextContent('MOCK');
  });
});

describe('ItemRow — рядок списку: знак · назва · мітки · дії', () => {
  it('має слоти в сталому порядку й тег li', () => {
    render(
      <ul>
        <ItemRow sign={<span data-testid="sign" />} title={<span>Target A</span>} meta={<span>verified</span>} actions={<button type="button">Add Target A</button>} />
      </ul>,
    );
    const li = screen.getByRole('listitem');
    expect(li).toHaveClass('ui-row');
    const parts = [...li.children].map((c) => c.className);
    expect(parts).toEqual(['ui-row__sign', 'ui-row__title', 'ui-row__meta', 'ui-row__actions']);
    expect(within(li).getByRole('button', { name: 'Add Target A' })).toBeInTheDocument();
  });

  it('необов’язкові слоти не рендеряться', () => {
    render(
      <ul>
        <ItemRow title="Only title" />
      </ul>,
    );
    expect(screen.getByRole('listitem').children).toHaveLength(1);
  });
});

describe('Disclosure — розгортний блок на <details>', () => {
  it('закритий за замовчуванням, розгортається кліком по заголовку', () => {
    render(<Disclosure summary="Details">hidden body</Disclosure>);
    const d = screen.getByText('Details').closest('details') as HTMLDetailsElement;
    expect(d).toHaveClass('ui-disclosure');
    expect(d.open).toBe(false);
    fireEvent.click(screen.getByText('Details'));
    expect(d.open).toBe(true);
  });

  it('defaultOpen відкриває одразу', () => {
    render(
      <Disclosure summary="Details" defaultOpen>
        body
      </Disclosure>,
    );
    expect((screen.getByText('Details').closest('details') as HTMLDetailsElement).open).toBe(true);
  });
});

describe('DataTable — таблиця з підписом, заголовками й прокруткою на вузькому екрані', () => {
  const columns = [
    { key: 'name', label: 'Parameter' },
    { key: 'value', label: 'Value', align: 'end' as const },
  ];
  const rows = [
    { id: 'a', cells: { name: 'Walking speed', value: '1 m/s' } },
    { id: 'b', cells: { name: 'O₂ use', value: <b>0.031 g/s</b> } },
  ];

  it('рендерить caption, th з scope="col" і клітинки', () => {
    render(<DataTable caption="Model coefficients" columns={columns} rows={rows} />);
    const table = screen.getByRole('table', { name: 'Model coefficients' });
    const headers = within(table).getAllByRole('columnheader');
    expect(headers.map((h) => h.textContent)).toEqual(['Parameter', 'Value']);
    for (const h of headers) expect(h).toHaveAttribute('scope', 'col');
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    expect(within(table).getByText('0.031 g/s')).toBeInTheDocument();
    expect(table.parentElement).toHaveClass('ui-table-wrap');
  });

  it('вирівнювання колонки — класом', () => {
    render(<DataTable caption="T" columns={columns} rows={rows} />);
    expect(screen.getByText('1 m/s').closest('td')).toHaveClass('ui-table__cell--end');
  });
});
