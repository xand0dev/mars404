import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReachabilityResult, Target } from '../../contracts';
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
});

describe('F6-AC2 · картка цілі', () => {
  it('Given ціль, When картку відкрито, Then видно why, фото, credit, sol, джерело і чесний підпис фото', async () => {
    loadTargets([targets[0]!]);
    const user = userEvent.setup();

    render(<TargetsPanel />);
    await user.click(screen.getByRole('button', { name: 'Open Target A' }));

    const card = screen.getByRole('article', { name: 'Target A' });
    expect(within(card).getByText('Why visit target a.')).toBeVisible();
    expect(within(card).getByRole('img', { name: 'Navcam view for target a' })).toBeVisible();
    expect(within(card).getByText(/NASA\/JPL-Caltech/)).toBeVisible();
    expect(within(card).getByText(/Sol 1234/)).toBeVisible();
    expect(within(card).getByRole('link', { name: /source/i })).toHaveAttribute('href', 'https://example.test/a');
    expect(within(card).getByText(/view from rover stop/i)).toBeVisible();
  });
});

describe('F6-AC3 · вибір цілі й reachability', () => {
  it('Given картку, When Add to route натиснуто, Then викликано toggleTarget(id) і показано reach warning', async () => {
    const toggleTarget = vi.fn();
    const reach: ReachabilityResult = {
      status: 'estimated',
      mask: new Uint8Array(4),
      returnInS: 600,
      deficits: ['o2'],
      swap: { dropId: 'a', addId: 'b' },
      warnings: ['Target A is outside the return envelope.'],
    };
    loadTargets(targets.slice(0, 2), reach);
    useMission.setState({ selectedTargetIds: ['a'], toggleTarget });
    const user = userEvent.setup();

    render(<TargetsPanel />);
    await user.click(screen.getByRole('button', { name: 'Open Target A' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/outside the return envelope/i);
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(toggleTarget).toHaveBeenCalledWith('a');
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
