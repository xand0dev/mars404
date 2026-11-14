import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import type { RoutePlan, Target } from '../../contracts';
import { evaluateGoNoGo } from '../../contracts/gonogo';
import { mockTargets } from '../../mocks';
import { resetMission, useMission } from '../../store/useMission';
import { ChecklistPanel } from './ChecklistPanel';

const plan = (time = 21 * 60, slope = 20): RoutePlan => ({
  status: 'ok',
  path: [],
  segments: [{ from: [0, 0], to: [1, 1], dist: 1, slope, time: 1, o2: 1, energy: 1, dose: null }],
  legs: [],
  totals: { time, o2: 1, energy: 1, dose: null, dist: 1 },
  warnings: [],
  requestId: 1,
});

const photographedTarget: Target = {
  ...mockTargets[0]!,
  photo: {
    url: './data/gale/photos/mock.jpg',
    alt: 'MOCK Navcam view',
    credit: 'MOCK',
    status: 'mock',
  },
};

beforeEach(() => resetMission());

describe('F6-AC6 · Pre-EVA checklist', () => {
  it('Given довгий крутий план, цілі й фото, When панель відкрито, Then побудовано 7 пунктів із причинами', async () => {
    useMission.setState({
      site: 'gale',
      plan: plan(),
      targets: [photographedTarget, mockTargets[1]!],
      selectedTargetIds: [photographedTarget.id, mockTargets[1]!.id],
    });

    render(<ChecklistPanel />);

    await waitFor(() => expect(screen.getAllByRole('checkbox')).toHaveLength(7));
    expect(screen.getByText(/route duration 21 min exceeds 20 min/i)).toBeVisible();
    expect(screen.getByText(/route includes slope 20°/i)).toBeVisible();
    expect(screen.getByText(/2 science targets selected/i)).toBeVisible();
    expect(screen.getByText(/selected target or surface photo includes a camera view/i)).toBeVisible();
    expect(screen.getByText(/20 min and 20° thresholds are assumption/i)).toBeVisible();
  });

  it('Given короткий пологий план без цілей і фото, Then лишаються три обов’язкові перевірки', async () => {
    useMission.setState({ site: 'gale', plan: plan(20 * 60, 19), selectedTargetIds: [], photos: [] });

    render(<ChecklistPanel />);

    await waitFor(() => expect(screen.getAllByRole('checkbox')).toHaveLength(3));
    expect(screen.queryByRole('checkbox', { name: /spare o₂/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /tether/i })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /tablet battery/i })).toBeVisible();
    expect(screen.getByRole('checkbox', { name: /suit sensors/i })).toBeVisible();
    expect(screen.getByRole('checkbox', { name: /radio check/i })).toBeVisible();
  });

  it('Given відмічений пункт, When план змінено, Then done збережено для того самого id', async () => {
    useMission.setState({ site: 'gale', plan: plan() });
    const user = userEvent.setup();
    render(<ChecklistPanel />);
    const tablet = await screen.findByRole('checkbox', { name: /tablet battery/i });

    await user.click(tablet);
    expect(tablet).toBeChecked();
    expect(useMission.getState().checklist.find((item) => item.id === 'tablet-battery')?.done).toBe(true);

    useMission.setState({ plan: { ...plan(20 * 60, 19), requestId: 2 } });
    await waitFor(() => expect(screen.getByRole('checkbox', { name: /tablet battery/i })).toBeChecked());
  });

  it('Given checklist, When усі checkbox відмічено, Then toggleChecklistItem оновлює store і EQP стає GO', async () => {
    useMission.setState({ site: 'gale', plan: plan(20 * 60, 19) });
    const user = userEvent.setup();
    render(<ChecklistPanel />);
    const boxes = await screen.findAllByRole('checkbox');

    expect(evaluateGoNoGo(useMission.getState()).stations.find((station) => station.id === 'EQP')?.call).toBe('caution');
    for (const box of boxes) await user.click(box);

    expect(useMission.getState().checklist.every((item) => item.done)).toBe(true);
    expect(evaluateGoNoGo(useMission.getState()).stations.find((station) => station.id === 'EQP')?.call).toBe('go');
  });
});
