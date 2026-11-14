import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReachabilityResult, Region, RoutePlan } from '../../contracts';
import { mockGrid, mockLimits, mockModel } from '../../mocks';
import { resetMission, useMission } from '../../store/useMission';
import { GoNoGoPanel } from './GoNoGo';
import { Hud } from './Hud';

// F7-AC7 (SPEC §7.10): HUD лише показує evaluateGoNoGo — нічого не рахує.
const plan: RoutePlan = {
  status: 'ok', path: [], segments: [], legs: [],
  totals: { time: 900, o2: 180, energy: 0, dose: null, dist: 0 }, warnings: [], requestId: 1,
};
const fullMask = () => new Uint8Array(mockGrid.width * mockGrid.height).fill(1);
const reach = (extra: Partial<ReachabilityResult> = {}): ReachabilityResult => ({
  status: 'estimated', mask: fullMask(), returnInS: 1980, deficits: [], swap: null,
  abort: { segments: [], pointOfNoReturnS: null, emergencyO2G: 360 }, warnings: [], ...extra,
});
const withTargets = () => {
  useMission.getState().setSite('gale');
  useMission.getState().toggleTarget('mock-a');
  useMission.getState().toggleTarget('mock-b');
};
/** Усе відомо й у межах → GO. */
const goState = () => {
  withTargets();
  useMission.setState({
    plan, reach: reach(), region: { status: 'verified' } as unknown as Region,
    model: { ...mockModel, doseUSvPerS: 0.01 }, limits: { ...mockLimits, dose: 1000 },
    checklist: [{ id: 'radio', label: 'Radio check with base', reason: 'always', done: true }],
  });
};
/** Штатний mock: рельєф MOCK, доза невідома, модель incomplete → CAUTION. */
const cautionState = () => {
  withTargets();
  useMission.setState({ plan, reach: reach({ status: 'incomplete' }) });
};
const verdict = () => screen.getByTestId('gonogo-verdict');

beforeEach(() => {
  resetMission();
  vi.useFakeTimers({ shouldAdvanceTime: false });
  vi.setSystemTime(new Date('2026-11-14T16:42:05'));
});
afterEach(() => vi.useRealTimers());

describe('F7-AC7 · вердикт і станції', () => {
  it('без сайту → HOLD, усі 9 станцій з причиною й наступною дією', () => {
    render(<GoNoGoPanel />);
    expect(verdict()).toHaveTextContent('HOLD');
    const list = screen.getByRole('list', { name: 'Station calls' });
    const items = within(list).getAllByRole('listitem');
    expect(items.map((li) => li.getAttribute('data-station'))).toEqual(['RTE', 'LSS', 'RTN', 'SCI', 'ABT', 'DAT', 'RAD', 'MDL', 'EQP']);
    for (const li of items) expect(li).toHaveTextContent('No site selected');
    expect(screen.getAllByText('Choose “Gale / Mount Sharp”').length).toBeGreaterThan(0);
  });

  it('GO → «GO · within model», ніколи «safe»; кнопка «Start EVA»', () => {
    goState();
    render(<GoNoGoPanel />);
    expect(verdict()).toHaveTextContent('GO · within model');
    expect(document.body.textContent).not.toMatch(/\bsafe\b/i);
    expect(screen.getByRole('button', { name: 'Start EVA' })).toBeInTheDocument();
  });

  it('кожен виклик станції — іконка й слово, не лише колір', () => {
    cautionState();
    render(<GoNoGoPanel />);
    const rad = screen.getByRole('listitem', { name: /RAD/ });
    expect(rad).toHaveTextContent('⚠');
    expect(rad).toHaveTextContent('CAUTION');
    expect(rad).toHaveTextContent('Dose: no data');
  });
});

describe('F7-AC7 · CAUTION перед виходом — утримування 1,5 с', () => {
  it('вердикт «GO · CAUTION», замість «Start EVA» — кнопка утримування', () => {
    cautionState();
    render(<GoNoGoPanel />);
    expect(verdict()).toHaveTextContent('GO · CAUTION');
    expect(screen.queryByRole('button', { name: 'Start EVA' })).toBeNull();
    expect(screen.getByRole('button', { name: /Hold to confirm EVA start/ })).toBeInTheDocument();
  });

  it('мишею: відпустити раніше за 1,5 с — не підтверджено; утримати 1,5 с — підтверджено з часом і станціями', () => {
    cautionState();
    render(<GoNoGoPanel />);
    const btn = screen.getByRole('button', { name: /Hold to confirm EVA start/ });
    fireEvent.pointerDown(btn);
    act(() => vi.advanceTimersByTime(1400));
    fireEvent.pointerUp(btn);
    expect(screen.queryByText(/Confirmed/)).toBeNull();

    fireEvent.pointerDown(btn);
    act(() => vi.advanceTimersByTime(1500));
    const rec = screen.getByText(/Confirmed/);
    expect(rec).toHaveTextContent('Confirmed 16:42:07');
    expect(rec).toHaveTextContent('GO · CAUTION');
    expect(rec).toHaveTextContent(/DAT, RAD, MDL, EQP/);
    expect(rec).toHaveTextContent('not saved');
  });

  it('клавіатурою: утримати Space 1,5 с — підтверджено', () => {
    cautionState();
    render(<GoNoGoPanel />);
    const btn = screen.getByRole('button', { name: /Hold to confirm EVA start/ });
    fireEvent.keyDown(btn, { key: ' ' });
    act(() => vi.advanceTimersByTime(1500));
    fireEvent.keyUp(btn, { key: ' ' });
    expect(screen.getByText(/Confirmed/)).toBeInTheDocument();
  });

  it('відпустити клавішу раніше — скасовано', () => {
    cautionState();
    render(<GoNoGoPanel />);
    const btn = screen.getByRole('button', { name: /Hold to confirm EVA start/ });
    fireEvent.keyDown(btn, { key: 'Enter' });
    act(() => vi.advanceTimersByTime(700));
    fireEvent.keyUp(btn, { key: 'Enter' });
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.queryByText(/Confirmed/)).toBeNull();
  });
});

describe('F7-AC7 · NO-GO — дії виправлення', () => {
  it('перед виходом кнопки виходу немає; дія replace-target викликає replaceTarget', () => {
    withTargets();
    useMission.setState({ plan, reach: reach({ deficits: ['o2'], returnInS: -60, swap: { dropId: 'mock-a', addId: 'mock-d' } }) });
    render(<GoNoGoPanel />);
    expect(verdict()).toHaveTextContent('NO-GO');
    expect(screen.queryByRole('button', { name: 'Start EVA' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Hold to confirm/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'LSS fix: Replace MOCK Site A with MOCK Site D' }));
    expect(useMission.getState().selectedTargetIds).toEqual(['mock-d', 'mock-b']);
  });

  it('дія remove-target викликає toggleTarget', () => {
    withTargets();
    useMission.setState({ plan, reach: reach({ deficits: ['o2'], returnInS: -60, swap: null }) });
    render(<GoNoGoPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'LSS fix: Remove MOCK Site B' }));
    expect(useMission.getState().selectedTargetIds).toEqual(['mock-a']);
  });
});

describe('F7-AC7 · під час виходу', () => {
  it('NO-GO при time > 0 → «Return to base now» з role="alert», і на HUD лише один alert', () => {
    withTargets();
    useMission.setState({ plan, reach: reach({ deficits: ['o2'], returnInS: -60 }), time: 600 });
    render(<Hud />);
    const alerts = screen.getAllByRole('alert');
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toHaveTextContent('Return to base now');
  });

  it('GO під час виходу — без кнопки старту, вердикт оновлюється сам', () => {
    goState();
    useMission.setState({ time: 300 });
    render(<GoNoGoPanel />);
    expect(verdict()).toHaveTextContent('GO · within model');
    expect(screen.queryByRole('button', { name: 'Start EVA' })).toBeNull();
  });
});

describe('F7-AC7 · у HUD', () => {
  it('«Start EVA» пише запис і переводить фокус на «Elapsed»', () => {
    goState();
    render(<Hud />);
    fireEvent.click(screen.getByRole('button', { name: 'Start EVA' }));
    expect(screen.getByText(/Confirmed 16:42:05/)).toHaveTextContent('GO');
    expect(screen.getByRole('spinbutton', { name: 'Elapsed, s' })).toHaveFocus();
  });
});

describe('F7-AC7 · станція EQP (чекліст, §7.13)', () => {
  it('порожній чекліст → CAUTION з дією «Open the pre-EVA checklist»', () => {
    cautionState();
    render(<GoNoGoPanel />);
    const eqp = screen.getByRole('listitem', { name: /EQP/ });
    expect(eqp).toHaveTextContent('CAUTION');
    expect(eqp).toHaveTextContent('Open the pre-EVA checklist');
  });
});

// T27: станції — чипи «код · іконка · слово»; деталі по кліку; NO-GO і станції з кнопкою-виправленням розгорнуті.
describe('T27 · чипи станцій', () => {
  const chip = (id: string) => within(screen.getByRole('listitem', { name: new RegExp(`^${id}:`) })).getByRole('button', { name: new RegExp(`^${id} (GO|CAUTION|NO-GO|HOLD)$`) });

  it('GO і CAUTION без кнопки-виправлення — згорнуті; клік розгортає й згортає', () => {
    cautionState();
    render(<GoNoGoPanel />);
    expect(chip('RTE')).toHaveAttribute('aria-expanded', 'false');
    expect(chip('RAD')).toHaveTextContent('RAD');
    expect(chip('RAD')).toHaveTextContent('CAUTION');
    expect(chip('RAD')).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(chip('RAD'));
    expect(chip('RAD')).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(chip('RAD').getAttribute('aria-controls') as string)).toHaveTextContent('Dose: no data');
    fireEvent.click(chip('RAD'));
    expect(chip('RAD')).toHaveAttribute('aria-expanded', 'false');
  });

  it('NO-GO зі швидкою дією розгорнуто одразу: кнопка-виправлення видна', () => {
    withTargets();
    useMission.setState({ plan, reach: reach({ deficits: ['o2'], returnInS: -60, swap: { dropId: 'mock-a', addId: 'mock-d' } }) });
    render(<GoNoGoPanel />);
    expect(chip('LSS')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('listitem', { name: /^LSS:/ })).toHaveClass('is-open');
  });
});
