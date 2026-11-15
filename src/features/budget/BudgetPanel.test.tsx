import { beforeEach, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { assessReach, buildReachTrees, emptyPlan, planRoute } from '../../core';
import type { Annotation, Region, Source } from '../../contracts';
import { applyAnnotations, xyToCell } from '../../contracts/planning';
import { mockBase, mockGrid, mockLimits, mockModel, mockTargets } from '../../mocks';
import { resetMission, useMission } from '../../store/useMission';
import { BudgetEngine } from './BudgetEngine';
import { BudgetPanel } from './BudgetPanel';

const store = () => useMission.getState();
/** Панель без пульта (пульт — портал у <body> з тими самими числами). */
const panel = () => within(screen.getByRole('region', { name: 'Resources' }));
const renderBudget = (site: 'gale' | null = 'gale') => {
  act(() => store().setSite(site));
  return render(
    <>
      <BudgetEngine />
      <BudgetPanel />
    </>,
  );
};

beforeEach(() => resetMission());

describe('BudgetEngine + BudgetPanel', () => {
  it('F5-AC1: у базі без цілей — «Return in 48 min», статус incomplete з текстом', () => {
    renderBudget();
    expect(panel().getByText('Return in 48 min')).toBeInTheDocument();
    expect(screen.getByText(/return not fully assessed/i)).toBeInTheDocument();
    expect(store().reach?.status).toBe('incomplete');
    expect(store().budget).toEqual({ time: 3600, o2: 720, energy: 600, dose: null });
  });

  it('«O₂ −40%» звужує запас, «Reset» повертає ліміти', async () => {
    renderBudget();
    await userEvent.click(screen.getByRole('button', { name: 'O₂ −40%' }));

    expect(store().limits.o2).toBeCloseTo(432, 6);
    expect(screen.getByRole('button', { name: 'O₂ −40%' })).toHaveAttribute('aria-pressed', 'true');
    expect(panel().getByText('Return in 28 min')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(store().limits.o2).toBe(720);
    expect(panel().getByText('Return in 48 min')).toBeInTheDocument();
  });

  it('обрані цілі без чинного плану — жодного числа, «Build route» / «Calculating…»', () => {
    renderBudget();
    act(() => store().toggleTarget('mock-a'));
    expect(panel().getByText('Build route to assess return')).toBeInTheDocument();
    expect(panel().queryByText(/Return in \d+ min/)).not.toBeInTheDocument();

    act(() => store().setPlan(emptyPlan('pending', 1)));
    expect(panel().getByText('Calculating…')).toBeInTheDocument();
  });

  it('F5-AC3: ціль поза ореолом після «O₂ −40%» — попередження і кандидат заміни', async () => {
    renderBudget();
    act(() => store().toggleTarget('mock-c'));
    await userEvent.click(screen.getByRole('button', { name: 'O₂ −40%' }));

    expect(screen.getByText(/MOCK Site C is outside the reachable area/)).toBeInTheDocument();
    expect(store().reach?.swap?.dropId).toBe('mock-c');
    expect(screen.getByText(/Suggested swap \(model cost\): MOCK Site C →/)).toBeInTheDocument();
  });

  it('F5-AC4: невалідний параметр → помилка, порожня маска, без «Within model»', () => {
    renderBudget();
    act(() => useMission.setState({ model: { ...mockModel, speedMps: 0 } }));

    expect(screen.getByRole('alert')).toHaveTextContent(/invalid model parameters.*speedMps/i);
    expect(screen.queryByText(/within model/i)).not.toBeInTheDocument();
    expect(store().reach?.status).toBe('invalid');
    expect(store().reach?.returnInS).toBeNull();
  });

  it('дефіцит — role="status" з назвою ресурсу; єдиний alert дефіциту — у HUD (#9)', () => {
    renderBudget();
    act(() => store().setTime(3500));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getAllByRole('status').some((el) => /deficit: time/i.test(el.textContent ?? ''))).toBe(true);
  });

  it('дефіцит O₂ — людська назва ресурсу, а не ключ (#9)', () => {
    renderBudget();
    act(() => store().toggleTarget('mock-c'));
    act(() => store().setPlan({ ...emptyPlan('ok', 1), totals: { time: 0, o2: 600, energy: 0, dose: null, dist: 0 } }));

    const status = screen.getAllByRole('status').find((el) => /deficit/i.test(el.textContent ?? ''))!;
    expect(status).toHaveTextContent(/Deficit: O₂ —/);
  });

  it('#32: місце не обрано — «Return in — min», як у HUD (#9 п.3)', () => {
    renderBudget(null);
    expect(panel().getByText('Return in — min')).toBeInTheDocument();
  });

  it('#32: шкали показують резерв і планову витрату (Gauge F7)', () => {
    renderBudget();
    expect(screen.getByText(/O₂: 720 g/)).toHaveTextContent('reserve 144 g');

    act(() => store().toggleTarget('mock-a'));
    act(() => store().setPlan({ ...emptyPlan('ok', 1), totals: { time: 900, o2: 180, energy: 10, dose: null, dist: 900 } }));
    expect(screen.getByText(/O₂: 720 g/)).toHaveTextContent('plan 180 g');
    expect(panel().getByText('Return in 33 min')).toBeInTheDocument();
  });

  it('#32: дефіцит позначено на шкалі ресурсу й рівнем deficit (⛔) у статусі', () => {
    const { container } = renderBudget();
    act(() => store().setTime(3500));

    // 3500 с: час 100 < 720 резерву, O₂ 720 − 700 = 20 < 144 резерву — обидва в дефіциті.
    const marked = [...container.querySelectorAll('.ui-gauge--deficit')].map((el) => el.textContent?.split(':')[0]);
    expect(marked).toEqual(['Time', 'O₂']);
    expect(panel().getByText('Return in 0 min')).toBeInTheDocument();
    const status = screen.getAllByRole('status').find((el) => /deficit/i.test(el.textContent ?? ''))!;
    expect(status).toHaveTextContent('⛔');
  });

  it('#32: розрахунок маршруту — рівень pending (⏳)', () => {
    renderBudget();
    act(() => store().toggleTarget('mock-a'));
    act(() => store().setPlan(emptyPlan('pending', 1)));
    const status = screen.getAllByRole('status').find((el) => /calculating/i.test(el.textContent ?? ''))!;
    expect(status).toHaveTextContent('⏳');
  });

  it('F5-AC5: BudgetEngine публікує reach.abort для чинного плану; «O₂ −40%» не покращує', async () => {
    renderBudget();
    const target = mockTargets.find((t) => t.id === 'mock-c')!;
    const plan = planRoute({ grid: mockGrid, model: mockModel, start: mockBase, waypoints: [target.coordinates], base: mockBase, requestId: 1 });
    act(() => store().toggleTarget('mock-c'));
    act(() => store().setPlan(plan));

    const normal = store().reach?.abort;
    expect(normal?.segments).toHaveLength(plan.segments.length);

    await userEvent.click(screen.getByRole('button', { name: 'O₂ −40%' }));
    const reduced = store().reach?.abort;
    expect(reduced?.segments.filter((s) => s.ok).length).toBeLessThanOrEqual(normal!.segments.filter((s) => s.ok).length);
    reduced?.segments.forEach((s, i) => {
      if (s.ok) expect(normal!.segments[i]!.ok).toBe(true);
    });
  });

  it('F5-AC5: без чинного плану reach.abort = null', () => {
    renderBudget();
    expect(store().reach).not.toBeNull();
    expect(store().reach?.abort).toBeNull();
  });

  describe('#20 / SPEC §7.6: джерело ліміту біля шкали', () => {
    const source = (status: Source['status']): Source => ({ id: `src-${status}`, title: `Source ${status}`, status, note: '' });
    const region = (limitsEvidence?: Region['limitsEvidence']): Region => ({
      schemaVersion: 1, id: 'gale', name: 'Test Gale', status: 'verified',
      grid: { width: mockGrid.width, height: mockGrid.height, metersPerPixel: mockGrid.metersPerPixel, originM: mockGrid.originM, rowOrder: 'north-to-south', boundsLonLat: [137.4, -4.75, 137.422, -4.728], crs: 'test' },
      files: { elevation: 'e.f32', slope: 's.f32', walkable: 'w.u8', hazard: 'h.f32', texture: 'hirise.jpg', targets: 'targets.geojson' },
      noData: -9999, base: mockBase, model: mockModel, limits: mockLimits, layers: [], sources: [],
      ...(limitsEvidence ? { limitsEvidence } : {}),
    });
    const evidenceOf = (label: string) => screen.getByTestId(`limit-evidence-${label}`).textContent;
    const open = (r: Region) => {
      renderBudget();
      act(() => store().setRegionData({ region: r, grid: mockGrid, targets: [] }));
    };

    it('verified — без позначки; assumption / pending — «assumption» з назвою джерела', () => {
      open(region({ time: source('assumption'), o2: source('verified'), energy: source('pending'), dose: source('assumption') }));
      expect(screen.queryByTestId('limit-evidence-o2')).not.toBeInTheDocument();
      expect(evidenceOf('time')).toMatch(/limit: assumption · Source assumption/);
      expect(evidenceOf('energy')).toMatch(/limit: assumption · Source pending/);
    });

    it('немає limitsEvidence — «assumption (no source)» біля кожної шкали', () => {
      open(region());
      for (const key of ['time', 'o2', 'energy', 'dose']) expect(evidenceOf(key)).toMatch(/limit: assumption \(no source\)/);
    });

    it('до завантаження району — mock-ліміти позначені «MOCK»', () => {
      renderBudget();
      for (const key of ['time', 'o2', 'energy', 'dose']) expect(evidenceOf(key)).toMatch(/limit: MOCK/);
    });
  });

  describe('F5-AC6: мітки екіпажу в ореолі й Abort map (SPEC §7.12)', () => {
    const mark = (kind: Annotation['kind']): Annotation => ({
      id: `${kind}-1`, kind, coordinates: mockTargets.find((t) => t.id === 'mock-a')!.coordinates, radiusM: 12, text: '', createdAt: '2026-11-14T12:00:00Z', origin: 'this-eva',
    });
    const cellA = () => xyToCell(mockGrid, mockTargets.find((t) => t.id === 'mock-a')!.coordinates)!.index;

    it('impassable — клітинки під міткою не входять в ореол', () => {
      renderBudget();
      expect(store().reach?.mask[cellA()]).toBe(1);
      act(() => store().addAnnotation(mark('impassable')));
      expect(store().reach?.mask[cellA()]).toBe(0);
    });

    it('hazard — клітинка лишається в ореолі (прохідна, лише дорожча)', () => {
      renderBudget();
      act(() => store().addAnnotation(mark('hazard')));
      expect(store().reach?.mask[cellA()]).toBe(1);
    });

    it('Abort map рахується на тій самій сітці з мітками, що й ореол', () => {
      renderBudget();
      const target = mockTargets.find((t) => t.id === 'mock-c')!;
      const plan = planRoute({ grid: mockGrid, model: mockModel, start: mockBase, waypoints: [target.coordinates], base: mockBase, requestId: 1 });
      act(() => store().toggleTarget('mock-c'));
      act(() => store().setPlan(plan));
      const plainAbort = store().reach!.abort;

      const blocker: Annotation = { ...mark('impassable'), coordinates: plan.path[Math.floor(plan.path.length / 3)]!, radiusM: 25 };
      act(() => useMission.setState({ annotations: [blocker] }));

      const marked = applyAnnotations(mockGrid, [blocker]);
      const expected = assessReach(
        { grid: marked, model: mockModel, limits: mockLimits, elapsedS: 0, position: mockBase, base: mockBase, plan, targets: mockTargets, selectedTargetIds: ['mock-c'] },
        buildReachTrees(marked, mockModel, mockBase, mockBase),
      ).reach.abort;
      expect(expected).not.toEqual(plainAbort);
      expect(store().reach?.abort).toEqual(expected);
    });
  });

  describe('Life support: головне число, статус словом, що обмежує', () => {
    const lifeStatus = () => screen.getByTestId('life-support-status').textContent;
    const resourceStatus = (key: string) => screen.getByTestId(`resource-status-${key}`).textContent;
    const planWith = (o2: number) => ({ ...emptyPlan('ok', 1), totals: { time: 900, o2, energy: 10, dose: null, dist: 900 } });

    it('у базі без цілей — «Life support», «WITHIN MODEL», ресурси OK, доза NO DATA', () => {
      renderBudget();
      expect(screen.getByText('Life support')).toBeInTheDocument();
      expect(lifeStatus()).toBe('WITHIN MODEL');
      expect(resourceStatus('o2')).toBe('OK');
      expect(resourceStatus('time')).toBe('OK');
      expect(resourceStatus('dose')).toBe('NO DATA');
    });

    it('запас < 15 хв (поріг GO / NO-GO, SPEC §7.10) — «LOW MARGIN»', () => {
      renderBudget();
      act(() => store().setTime(2300));
      expect(panel().getByText('Return in 9 min')).toBeInTheDocument();
      expect(lifeStatus()).toBe('LOW MARGIN');
    });

    it('дефіцит — «RETURN NOW» і «DEFICIT» на ресурсі', () => {
      renderBudget();
      act(() => store().setTime(3500));
      expect(lifeStatus()).toBe('RETURN NOW');
      expect(resourceStatus('time')).toBe('DEFICIT');
    });

    it('чинний план — «limited by: time»; після «O₂ −40%» — «limited by: O₂»', async () => {
      renderBudget();
      act(() => store().toggleTarget('mock-a'));
      act(() => store().setPlan(planWith(50)));
      expect(screen.getByText('limited by: time')).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'O₂ −40%' }));
      expect(screen.getByText('limited by: O₂')).toBeInTheDocument();
    });

    it('сценарії підписані «What if»', () => {
      renderBudget();
      const whatIf = panel().getByRole('group', { name: 'What if' });
      expect(within(whatIf).getByRole('button', { name: 'O₂ −40%' })).toBeInTheDocument();
      expect(within(whatIf).getByRole('button', { name: 'Reset' })).toBeInTheDocument();
    });

    it('невалідна модель — «NOT ASSESSED»', () => {
      renderBudget();
      act(() => useMission.setState({ model: { ...mockModel, speedMps: 0 } }));
      expect(lifeStatus()).toBe('NOT ASSESSED');
    });
  });

  describe('Пульт EVA (планшет): Return in і What if під пальцем', () => {
    const dock = () => screen.getByRole('region', { name: 'Life support controls' });

    it('показує Return in зі статусом і що обмежує; O₂ −40% і Reset з пульта', async () => {
      renderBudget();
      expect(dock()).toHaveTextContent('Return in 48 min');
      expect(dock()).toHaveTextContent('WITHIN MODEL');

      await userEvent.click(within(dock()).getByRole('button', { name: 'O₂ −40% from dock' }));
      expect(store().limits.o2).toBeCloseTo(432, 6);
      expect(within(dock()).getByRole('button', { name: 'O₂ −40% from dock' })).toHaveAttribute('aria-pressed', 'true');

      await userEvent.click(within(dock()).getByRole('button', { name: 'Reset limits from dock' }));
      expect(store().limits.o2).toBe(720);
    });

    it('згортання: aria-expanded і data-eva-dock на <html>, стан пам’ятається', async () => {
      renderBudget();
      const toggle = within(dock()).getByRole('button', { name: 'Collapse controls' });
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await userEvent.click(toggle);
      expect(document.documentElement.dataset.evaDock).toBe('collapsed');
      expect(within(dock()).getByRole('button', { name: 'Expand controls' })).toHaveAttribute('aria-expanded', 'false');
      expect(localStorage.getItem('mars404.evaDock')).toBe('collapsed');
      await userEvent.click(within(dock()).getByRole('button', { name: 'Expand controls' }));
      expect(document.documentElement.dataset.evaDock).toBe('open');
    });

    it('без обраного місця пульта немає', () => {
      renderBudget(null);
      expect(screen.queryByRole('region', { name: 'Life support controls' })).not.toBeInTheDocument();
    });
  });

  it('джерела лімітів і резерв — у згорнутому «Sources of limits»', () => {
    renderBudget();
    const details = screen.getByText('Sources of limits').closest('details')!;
    expect(within(details).getByTestId('limit-evidence-o2')).toBeInTheDocument();
    expect(within(details).getByText(/Reserve 20%/)).toBeInTheDocument();
  });

  describe('Шторка пульта: тап або потягнути вгору — деталі', () => {
    beforeEach(() => localStorage.clear());
    const handle = () => screen.getByRole('button', { name: /details/i });
    const details = () => screen.getByRole('region', { name: 'Life support details' });

    it('тап по ручці: пульт ↔ деталі', async () => {
      renderBudget();
      expect(handle()).toHaveAttribute('aria-expanded', 'false');
      await userEvent.click(handle());
      expect(document.documentElement.dataset.evaDock).toBe('expanded');
      expect(handle()).toHaveAttribute('aria-expanded', 'true');
      await userEvent.click(handle());
      expect(document.documentElement.dataset.evaDock).toBe('open');
    });

    it('ручка — лише смужка без тексту; тягнути на будь-яку висоту, висота пам’ятається', () => {
      renderBudget();
      expect(handle()).toHaveTextContent('');
      fireEvent.pointerDown(handle(), { clientY: 600, pointerId: 1 });
      fireEvent.pointerMove(handle(), { clientY: 450, pointerId: 1 });
      fireEvent.pointerUp(handle(), { clientY: 450, pointerId: 1 });
      expect(document.documentElement.dataset.evaDock).toBe('expanded');
      expect(document.documentElement.style.getPropertyValue('--eva-sheet-h')).toBe('226px');
      expect(localStorage.getItem('mars404.evaSheetH')).toBe('226');
    });

    it('потягнути вниз нижче порогу — назад до пульта; з пульта вниз — згорнути', () => {
      renderBudget();
      fireEvent.pointerDown(handle(), { clientY: 600, pointerId: 1 });
      fireEvent.pointerMove(handle(), { clientY: 400, pointerId: 1 });
      fireEvent.pointerUp(handle(), { clientY: 400, pointerId: 1 });
      expect(document.documentElement.dataset.evaDock).toBe('expanded');

      fireEvent.pointerDown(handle(), { clientY: 400, pointerId: 1 });
      fireEvent.pointerMove(handle(), { clientY: 590, pointerId: 1 });
      fireEvent.pointerUp(handle(), { clientY: 590, pointerId: 1 });
      expect(document.documentElement.dataset.evaDock).toBe('open');

      fireEvent.pointerDown(handle(), { clientY: 600, pointerId: 1 });
      fireEvent.pointerMove(handle(), { clientY: 680, pointerId: 1 });
      fireEvent.pointerUp(handle(), { clientY: 680, pointerId: 1 });
      expect(document.documentElement.dataset.evaDock).toBe('collapsed');
    });

    it('клавіатура: ↑ — деталі, ↓ — назад до пульта', () => {
      renderBudget();
      fireEvent.keyDown(handle(), { key: 'ArrowUp' });
      expect(document.documentElement.dataset.evaDock).toBe('expanded');
      fireEvent.keyDown(handle(), { key: 'ArrowDown' });
      expect(document.documentElement.dataset.evaDock).toBe('open');
    });

    it('у кожного ресурсу свій колір — мітка data-resource у шторці й на панелі', () => {
      const { container } = renderBudget();
      expect(within(details()).getByRole('listitem', { name: 'O₂' })).toHaveAttribute('data-resource', 'o2');
      expect(container.querySelector('.life-resource[data-resource="time"]')).not.toBeNull();
    });

    it('кожен ресурс: зараз, витрата маршруту, лишиться після маршруту; доза — no data', () => {
      renderBudget();
      act(() => store().toggleTarget('mock-a'));
      act(() => store().setPlan({ ...emptyPlan('ok', 1), totals: { time: 900, o2: 180, energy: 10, dose: null, dist: 900 } }));
      const o2 = within(details()).getByRole('listitem', { name: 'O₂' });
      expect(o2).toHaveTextContent('720 g');
      expect(o2).toHaveTextContent('route 180 g');
      expect(o2).toHaveTextContent('540 g after route');
      expect(within(details()).getByRole('listitem', { name: 'Time' })).toHaveTextContent('45 min after route');
      expect(within(details()).getByRole('listitem', { name: 'Dose' })).toHaveTextContent('no data');
      expect(details()).toHaveTextContent('Emergency O₂ 360 g kept for the way back');
    });

    it('без плану — «after route» не вигадується', () => {
      renderBudget();
      expect(within(details()).getByRole('listitem', { name: 'O₂' })).not.toHaveTextContent('after route');
    });
  });
});
