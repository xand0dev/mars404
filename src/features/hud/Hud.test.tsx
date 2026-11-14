import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ReachabilityResult, RoutePlan } from '../../contracts';
import { REFERENCE_PLAN_TOTALS, REFERENCE_RETURN_MIN } from '../../mocks';
import { resetMission, useMission } from '../../store/useMission';
import { Hud } from './Hud';

const okPlan: RoutePlan = {
  status: 'ok', path: [], segments: [], legs: [],
  totals: { ...REFERENCE_PLAN_TOTALS, energy: 0, dose: null, dist: 0 },
  warnings: [], requestId: 1,
};
const reach = (extra: Partial<ReachabilityResult> = {}): ReachabilityResult => ({
  status: 'incomplete', mask: new Uint8Array(0), returnInS: 1980, deficits: [], swap: null, warnings: [], ...extra,
});
const withPlan = (r: ReachabilityResult) => {
  useMission.getState().setSite('gale');
  useMission.getState().toggleTarget('mock-a');
  useMission.getState().toggleTarget('mock-b');
  useMission.setState({ plan: okPlan, reach: r });
};

beforeEach(() => resetMission());

describe('F7 · Hud', () => {
  it('F7-AC3: еталон (план 900 с) → «Return in 33 min» і ризик іконкою + словами', () => {
    withPlan(reach());
    render(<Hud />);
    const hero = screen.getByText(/Return in/);
    expect(hero).toHaveTextContent(`Return in ${REFERENCE_RETURN_MIN.plan} min`);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('⚠');
    expect(status).toHaveTextContent('Estimate incomplete: dose — no data');
  });

  it('F7-AC1: «Return in N min» — найбільший текст HUD (клас hero)', () => {
    withPlan(reach());
    render(<Hud />);
    expect(screen.getByText(/Return in/)).toHaveClass('hud__return');
  });

  it('F7-AC4: NaN → «Return in — min», не «NaN min»', () => {
    withPlan(reach({ status: 'estimated', returnInS: NaN }));
    useMission.setState({ budget: { time: NaN, o2: NaN, energy: NaN, dose: null } });
    render(<Hud />);
    expect(screen.getByText(/Return in/)).toHaveTextContent('Return in — min');
    expect(document.body.textContent).not.toMatch(/NaN/);
  });

  it('F7-AC4: бейдж MOCK, поки дані mock', () => {
    render(<Hud />);
    expect(screen.getByText('MOCK')).toBeInTheDocument();
  });

  it('F7-AC2: дефіцит озвучується через role="alert"', () => {
    withPlan(reach({ returnInS: -60, deficits: ['o2'] }));
    render(<Hud />);
    expect(screen.getByRole('alert')).toHaveTextContent(/Deficit/);
  });

  it('F7-AC2: поле «Elapsed, s» має доступну назву і пише setTime', async () => {
    const user = userEvent.setup();
    withPlan(reach());
    render(<Hud />);
    const input = screen.getByRole('spinbutton', { name: 'Elapsed, s' });
    await user.clear(input);
    await user.type(input, '600');
    expect(useMission.getState().time).toBe(600);
  });

  it('некоректне «Elapsed» не пише в store', async () => {
    const user = userEvent.setup();
    render(<Hud />);
    const input = screen.getByRole('spinbutton', { name: 'Elapsed, s' });
    await user.clear(input);
    await user.type(input, '-5');
    expect(useMission.getState().time).toBe(0);
  });

  it('F7-AC5: «Replace A with B» → replaceTarget(dropId, addId) і фокус на «Elapsed»', async () => {
    const user = userEvent.setup();
    withPlan(reach({ returnInS: -60, deficits: ['o2'], swap: { dropId: 'mock-a', addId: 'mock-d' } }));
    render(<Hud />);
    await user.click(screen.getByRole('button', { name: 'Replace MOCK Site A with MOCK Site D' }));
    expect(useMission.getState().selectedTargetIds).toEqual(['mock-d', 'mock-b']);
    expect(screen.getByRole('spinbutton', { name: 'Elapsed, s' })).toHaveFocus();
  });

  it('F7-AC5: swap = null → кнопки немає, є порада', () => {
    withPlan(reach({ returnInS: -60, deficits: ['o2'] }));
    render(<Hud />);
    expect(screen.queryByRole('button', { name: /Replace/ })).toBeNull();
    expect(screen.getByText('Remove a target or return to base now')).toBeInTheDocument();
  });

  it('попередження F5 з reach.warnings видно в HUD (ціль поза ореолом)', () => {
    withPlan(reach({ warnings: ['MOCK Site B is outside the reachable area (model)'] }));
    render(<Hud />);
    expect(screen.getByText('MOCK Site B is outside the reachable area (model)')).toBeInTheDocument();
  });

  it('попередження не показуємо, поки план рахується (старі не «протікають»)', () => {
    withPlan(reach({ warnings: ['Calculating route…'] }));
    useMission.setState({ plan: { ...okPlan, status: 'pending' } });
    render(<Hud />);
    expect(screen.queryByText('Calculating route…')).toBeNull();
  });
});
