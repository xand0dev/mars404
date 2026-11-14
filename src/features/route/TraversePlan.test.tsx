import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { AbortPlan, RoutePlan, Segment, XY } from '../../contracts';
import { emptyPlan } from '../../core';
import { legSummaries } from './traverse-legs';
import { TraversePlan } from './TraversePlan';

const seg = (time: number, slope = 0): Segment => {
  const p: XY = [0, 0];
  return { from: p, to: p, dist: 10, slope, time, o2: 0.5, energy: 0.5, dose: null };
};
// 3 ноги: 4 + 3 + 3 відрізки.
const plan: RoutePlan = { ...emptyPlan('ok', 1), segments: Array.from({ length: 10 }, (_, k) => seg(60, k === 5 ? 18 : 2)), legs: [0, 4, 7] };
const labels = ['Start', 'Mont Mercou', 'Gardonne', 'Base'];
const abortOf = (ok: boolean[], pointOfNoReturnS: number | null): AbortPlan => ({ segments: ok.map((o) => ({ returnS: o ? 100 : null, ok: o })), pointOfNoReturnS, emergencyO2G: 56 });

describe('TraversePlan · ноги маршруту й точка неповернення', () => {
  it('legSummaries: межі ніг за plan.legs, суми, «no return» і найкрутіший схил', () => {
    const legs = legSummaries(plan, labels, abortOf([true, true, true, true, true, false, false, true, true, true], 300));
    expect(legs.map((l) => `${l.from} → ${l.to}`)).toEqual(['Start → Mont Mercou', 'Mont Mercou → Gardonne', 'Gardonne → Base']);
    expect(legs.map((l) => l.dist)).toEqual([40, 30, 30]);
    expect(legs.map((l) => l.time)).toEqual([240, 180, 180]);
    expect(legs.map((l) => l.noReturn)).toEqual([0, 2, 0]);
    expect(legs[1]!.maxSlope).toBe(18);
  });

  it('точка неповернення: хвилини від старту й номер відрізка, пояснення одним реченням', () => {
    render(<TraversePlan plan={plan} labels={labels} abort={abortOf([true, true, true, true, true, false, false, true, true, true], 300)} />);
    expect(screen.getByText('Point of no return in 5 min')).toBeInTheDocument();
    expect(screen.getByText(/segment 6 of 10/)).toBeInTheDocument();
    expect(screen.getByText(/cannot reach base with the emergency O₂/)).toBeInTheDocument();
  });

  it('повернення звідусіль — «Return possible from every segment»', () => {
    render(<TraversePlan plan={plan} labels={labels} abort={abortOf(Array(10).fill(true), null)} />);
    expect(screen.getByText(/Return possible from every segment/)).toBeInTheDocument();
  });

  it('без оцінки abort — блоку точки неповернення немає, ноги є', () => {
    render(<TraversePlan plan={plan} labels={labels} abort={null} />);
    expect(screen.queryByText(/point of no return/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('список ніг: назва, метри, хвилини, O₂ і стан словом', () => {
    render(<TraversePlan plan={plan} labels={labels} abort={abortOf([true, true, true, true, true, false, false, true, true, true], 300)} />);
    const list = screen.getByRole('list', { name: 'Route legs' });
    const [first, second] = within(list).getAllByRole('listitem');
    expect(first).toHaveTextContent('1 · Start → Mont Mercou');
    expect(first).toHaveTextContent('40 m · 4 min · 2.0 g O₂');
    expect(first).toHaveTextContent('OK');
    expect(second).toHaveTextContent('2 no return');
  });
});
