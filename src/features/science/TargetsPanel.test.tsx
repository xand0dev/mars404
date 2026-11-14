import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReachabilityResult, Target } from '../../contracts';
import { xyToCell } from '../../contracts/planning';
import { mockGrid } from '../../mocks';
import { resetMission, useMission } from '../../store/useMission';
import { TargetsPanel } from './TargetsPanel';

const originalToggleTarget = useMission.getState().toggleTarget;

const target = (id: string, locationAccuracy: Target['locationAccuracy'] = 'verified'): Target => ({
  id,
  name: `Target ${id.toUpperCase()}`,
  coordinates: [100, 100],
  lonLat: [137.4, -4.6],
  why: `Why visit target ${id}.`,
  sourceIds: [`source-${id}`],
  status: locationAccuracy === 'mock' ? 'mock' : 'verified',
  locationAccuracy,
  photo: {
    url: `./data/gale/photos/${id}.jpg`,
    alt: `Navcam view for target ${id}`,
    sourceUrl: `https://example.test/${id}`,
    credit: 'NASA/JPL-Caltech',
    sol: 1234,
    status: 'verified',
  },
});

const targets = [target('a'), target('b', 'approximate'), target('c', 'mock'), target('d'), target('e')];

function loadTargets(nextTargets = targets, reach: ReachabilityResult | null = null) {
  useMission.setState({ site: 'gale', targets: nextTargets, selectedTargetIds: [], reach });
}

function reachFor(targetValue: Target, reachable: boolean, status: ReachabilityResult['status'] = 'estimated'): ReachabilityResult {
  const mask = new Uint8Array(mockGrid.width * mockGrid.height);
  const cell = xyToCell(mockGrid, targetValue.coordinates);
  if (cell && reachable) mask[cell.index] = 1;
  return { status, mask, returnInS: 600, deficits: [], swap: null, abort: null, warnings: [] };
}

beforeEach(() => {
  resetMission();
  useMission.setState({ toggleTarget: originalToggleTarget });
});

describe('F6-AC1 · список наукових цілей', () => {
  it('Given пакет Gale, When список відкрито, Then видно 5–8 цілей і бейджі точності', async () => {
    loadTargets();
    const user = userEvent.setup();

    render(<TargetsPanel />);

    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getAllByText('verified')).toHaveLength(3);
    expect(screen.getByText('approximate')).toBeVisible();
    expect(screen.getByLabelText('Accuracy: MOCK')).toBeVisible();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Open Target A' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('article', { name: 'Target A' })).toBeVisible();
  });

  it('Given список цілей, When панель відкрита, Then рядки використовують дизайн-систему без зміни доступних назв', () => {
    loadTargets();

    render(<TargetsPanel />);

    const list = screen.getByRole('list');
    const rows = within(list).getAllByRole('listitem');
    expect(list).toHaveClass('ui-list');
    expect(rows[0]).toHaveClass('ui-row');
    expect(screen.getByRole('button', { name: 'Open Target A' })).toHaveClass('ui-btn--ghost');
    expect(screen.getByRole('button', { name: 'Add Target A' })).toHaveClass('ui-btn--primary');
    expect(screen.getAllByLabelText('Accuracy: verified')[0]).toHaveClass('ui-badge', 'ui-badge--verified');
    expect(screen.getByLabelText('Accuracy: approximate')).toHaveClass('ui-badge', 'ui-badge--assumption');
    expect(screen.getByLabelText('Accuracy: MOCK')).toHaveClass('ui-badge', 'ui-badge--mock');
  });
});

describe('F6-AC2 · картка цілі', () => {
  it('Given ціль, When картку відкрито, Then видно why, фото, credit, sol, джерело і чесний підпис фото', async () => {
    loadTargets([targets[0]!]);
    const user = userEvent.setup();

    const { container } = render(<TargetsPanel />);
    await user.click(screen.getByRole('button', { name: 'Open Target A' }));

    const card = screen.getByRole('article', { name: 'Target A' });
    expect(within(card).getByText('Why visit target a.')).toBeVisible();
    expect(within(card).getByRole('img', { name: 'Navcam view for target a' })).toBeVisible();
    expect(within(card).getByText(/NASA\/JPL-Caltech/)).toBeVisible();
    expect(within(card).getByText(/Sol 1234/)).toBeVisible();
    expect(within(card).getByRole('link', { name: /source/i })).toHaveAttribute('href', 'https://example.test/a');
    expect(within(card).getByText(/view from rover stop/i)).toBeVisible();
    expect(container.querySelector('.eva-sign--photo')).toBeInTheDocument();
  });
});

describe('F6-AC3 · вибір цілі й reachability', () => {
  it('Given ціль поза reach.mask, When картку відкрито, Then є warning і знак outside незалежно від swap', async () => {
    const toggleTarget = vi.fn();
    loadTargets(targets.slice(0, 2), reachFor(targets[0]!, false));
    useMission.setState({ selectedTargetIds: ['a'], toggleTarget });
    const user = userEvent.setup();

    const { container } = render(<TargetsPanel />);
    await user.click(screen.getByRole('button', { name: 'Open Target A' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/outside the current return envelope/i);
    expect(container.querySelector('.eva-sign--target.eva-sign--outside')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(toggleTarget).toHaveBeenCalledWith('a');
  });

  it('Given ціль у reach.mask, When список відкрито, Then знак selected/unselected не позначено outside', () => {
    loadTargets([targets[0]!], reachFor(targets[0]!, true));
    useMission.setState({ selectedTargetIds: ['a'] });

    const { container } = render(<TargetsPanel />);

    expect(container.querySelector('.eva-sign--target.eva-sign--selected')).toBeInTheDocument();
    expect(container.querySelector('.eva-sign--outside')).not.toBeInTheDocument();
  });

  it.each([
    ['reach відсутній', null],
    ['reach invalid', reachFor(targets[0]!, false, 'invalid')],
  ])('Given %s, When картку відкрито, Then видно “not assessed”, а не outside', async (_label, reach) => {
    loadTargets([targets[0]!], reach);
    const user = userEvent.setup();

    const { container } = render(<TargetsPanel />);
    await user.click(screen.getByRole('button', { name: 'Open Target A' }));

    expect(screen.getByRole('status')).toHaveTextContent(/reachability not assessed/i);
    expect(container.querySelector('.eva-sign--outside')).not.toBeInTheDocument();
  });

  it('Given ціль поза grid, When картку відкрито, Then вона позначена outside', async () => {
    const outside = { ...targets[0]!, coordinates: [-1, -1] as const };
    loadTargets([outside], reachFor(outside, false));
    const user = userEvent.setup();

    render(<TargetsPanel />);
    await user.click(screen.getByRole('button', { name: 'Open Target A' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/outside the current return envelope/i);
  });
});

describe('F6-AC4 · помилка фото', () => {
  it('Given фото не завантажилося, When картку відкрито, Then видно alt-заглушку і кнопка працює', async () => {
    const toggleTarget = vi.fn();
    loadTargets([targets[0]!]);
    useMission.setState({ toggleTarget });
    const user = userEvent.setup();

    render(<TargetsPanel />);
    await user.click(screen.getByRole('button', { name: 'Open Target A' }));
    fireEvent.error(screen.getByRole('img', { name: 'Navcam view for target a' }));

    expect(screen.getByRole('img', { name: 'Navcam view for target a' })).toHaveTextContent('Navcam view for target a');
    await user.click(screen.getByRole('button', { name: 'Add to route' }));
    expect(toggleTarget).toHaveBeenCalledWith('a');
  });
});
