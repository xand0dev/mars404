import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Annotation, XY } from '../../contracts';
import { cellCenter, xyToCell } from '../../contracts/planning';
import { mockGrid, mockModel, mockTargets } from '../../mocks';
import { resetMission, useMission } from '../../store/useMission';
import { RoutePanel } from './RoutePanel';

const store = () => useMission.getState();

beforeEach(() => resetMission());

describe('RoutePanel', () => {
  const impassable = (coordinates: XY, radiusM = 12): Annotation => ({
    id: 'mark-1', kind: 'impassable', coordinates, radiusM, text: 'loose sand', createdAt: '2026-11-14T12:00:00Z', origin: 'this-eva',
  });
  const buildTo = async (targetId: string) => {
    store().toggleTarget(targetId);
    render(<RoutePanel />);
    await userEvent.click(screen.getByRole('button', { name: 'Build route' }));
    await screen.findByText(/route found/i);
  };

  it('F4-AC7: мітка impassable на шляху → маршрут перебудовано сам в обхід мітки', async () => {
    await buildTo('mock-a');
    const before = store().plan!;
    const onPath = before.path[Math.floor(before.path.length / 4)]!;
    act(() => store().addAnnotation(impassable(onPath)));

    await screen.findByText(/route found/i);
    const after = store().plan!;
    expect(after.status).toBe('ok');
    expect(after).not.toBe(before);
    const markedCell = xyToCell(mockGrid, onPath)!.index;
    expect(after.path.some((p) => xyToCell(mockGrid, p)!.index === markedCell)).toBe(false);
  });

  it('F4-AC7: мітка impassable на цілі → чесне «no path» з кодом і поясненням про мітки', async () => {
    await buildTo('mock-a');
    act(() => store().addAnnotation(impassable(mockTargets.find((t) => t.id === 'mock-a')!.coordinates)));

    expect(await screen.findByText(/blocked-point/)).toBeInTheDocument();
    expect(store().plan?.status).toBe('no-path');
    expect(screen.getByText(/crew marks applied: 1 impassable/i)).toBeInTheDocument();
  });

  it('F4-AC7: у таблиці колонка «Risk», без причин — «nominal»', async () => {
    await buildTo('mock-a');
    expect(screen.getByRole('columnheader', { name: 'Risk' })).toBeInTheDocument();
    expect(screen.getAllByText('nominal').length).toBeGreaterThan(0);
  });

  it('F4-AC6: відрізки з abort.ok = false — іконка й текст «no return» у таблиці', async () => {
    store().toggleTarget('mock-a');
    render(<RoutePanel />);
    await userEvent.click(screen.getByRole('button', { name: 'Build route' }));
    await screen.findByText(/route found/i);

    const count = store().plan!.segments.length;
    const segments = Array.from({ length: count }, (_, i) => ({ returnS: i === 1 ? null : 100, ok: i !== 1 }));
    act(() => store().setReach({ status: 'incomplete', mask: new Uint8Array(0), returnInS: 600, deficits: [], swap: null, warnings: [],
      abort: { segments, pointOfNoReturnS: 10, emergencyO2G: 360 } }));

    expect(screen.getByRole('button', { name: /^Segment 2:.*no return/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Segment 1:/ }).getAttribute('aria-label')).not.toMatch(/no return/);
    expect(screen.getAllByText('no return with emergency O₂')).toHaveLength(1);
  });

  it('F4-AC6: вибір відрізка показує «View from here»', async () => {
    store().toggleTarget('mock-a');
    render(<RoutePanel />);
    await userEvent.click(screen.getByRole('button', { name: 'Build route' }));
    await screen.findByText(/route found/i);

    expect(screen.queryByRole('region', { name: 'View from here' })).not.toBeInTheDocument();
    store().setSelectedSegment(0);
    expect(await screen.findByRole('region', { name: 'View from here' })).toHaveTextContent('No surface photo within 300 m');
  });

  it('без цілей кнопка вимкнена з поясненням', () => {
    render(<RoutePanel />);
    expect(screen.getByRole('button', { name: 'Build route' })).toBeDisabled();
    expect(screen.getByText(/select at least one target/i)).toBeInTheDocument();
  });

  it('F4-AC1: Build → план ok у store, порядок цілей видно', async () => {
    store().toggleTarget('mock-a');
    store().toggleTarget('mock-c');
    render(<RoutePanel />);
    await userEvent.click(screen.getByRole('button', { name: 'Build route' }));

    expect(await screen.findByText(/route found/i)).toBeInTheDocument();
    expect(store().plan?.status).toBe('ok');
    const order = screen.getByRole('list', { name: 'Target order' });
    expect(within(order).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      expect.stringContaining('MOCK Site A'),
      expect.stringContaining('MOCK Site C'),
    ]);
  });

  it('порядок змінюється стрілкою, план перебудовується автоматично', async () => {
    store().toggleTarget('mock-a');
    store().toggleTarget('mock-c');
    render(<RoutePanel />);
    await userEvent.click(screen.getByRole('button', { name: 'Build route' }));
    await screen.findByText(/route found/i);

    await userEvent.click(screen.getByRole('button', { name: 'Move MOCK Site C up' }));

    expect(store().waypoints[0]).toEqual(mockTargets[2]!.coordinates);
    await screen.findByText(/route found/i);
    expect(store().plan?.status).toBe('ok');
  });

  it('F4-AC3: ціль на стіні → код причини з номером точки, старого маршруту немає', async () => {
    store().toggleTarget('mock-a');
    render(<RoutePanel />);
    await userEvent.click(screen.getByRole('button', { name: 'Build route' }));
    await screen.findByText(/route found/i);

    store().setWaypoints([mockTargets[0]!.coordinates, cellCenter(mockGrid, 50, 90)]);

    expect(await screen.findByRole('alert')).toHaveTextContent('blocked-point · point 2');
    expect(store().plan?.status).toBe('no-path');
    expect(store().plan?.path).toEqual([]);
    expect(screen.queryByRole('table', { name: /Route segments/ })).not.toBeInTheDocument();
  });

  it('F4-AC4: вибір відрізка в таблиці → setSelectedSegment і деталі з одиницями', async () => {
    store().toggleTarget('mock-a');
    render(<RoutePanel />);
    await userEvent.click(screen.getByRole('button', { name: 'Build route' }));
    await screen.findByText(/route found/i);

    await userEvent.click(screen.getByRole('button', { name: /^Segment 3: \d+\.\d m, [+−]\d+\.\d°$/ }));

    expect(store().selectedSegment).toBe(2);
    const details = screen.getByTestId('segment-details');
    for (const unit of [' m', '°', ' s', ' g O₂', ' Wh', 'dose no data']) expect(details).toHaveTextContent(unit);
  });

  it('таблиця — одна зупинка Tab, далі стрілки (сотні відрізків не забивають клавіатуру)', async () => {
    store().toggleTarget('mock-a');
    render(<RoutePanel />);
    await userEvent.click(screen.getByRole('button', { name: 'Build route' }));
    await screen.findByText(/route found/i);

    const rowButtons = screen.getAllByRole('button', { name: /^Segment \d+: / });
    expect(rowButtons.filter((b) => b.tabIndex === 0)).toHaveLength(1);

    rowButtons[0]!.focus();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(store().selectedSegment).toBe(2);
    expect(screen.getByRole('button', { name: /^Segment 3: \d+\.\d m, [+−]\d+\.\d°$/ })).toHaveFocus();

    await userEvent.keyboard('{End}');
    expect(store().selectedSegment).toBe(rowButtons.length - 1);
  });

  describe('#79: коефіцієнти моделі — коротке попередження й «Details»', () => {
    const openCoefficients = () => {
      const details = screen.getByText('Details: model coefficients').closest('details')!;
      act(() => {
        details.open = true;
        details.dispatchEvent(new Event('toggle'));
      });
      return details;
    };

    it('згорнуто — таблиці немає (бейджі не дублюють MOCK панелі)', () => {
      render(<RoutePanel />);
      expect(screen.queryByRole('table', { name: 'Model coefficients and sources' })).not.toBeInTheDocument();
    });

    it('попередження в одне речення з кількістю неперевірених', () => {
      render(<RoutePanel />);
      const total = Object.keys(mockModel.evidence).length;
      const unverified = Object.values(mockModel.evidence).filter((s) => s.status !== 'verified').length;
      expect(screen.getByText(`${unverified} of ${total} model coefficients have no verified source. Model, not certified navigation.`)).toBeInTheDocument();
      expect(screen.queryByText(/speedMps \(MOCK\)/)).not.toBeInTheDocument();
    });

    it('таблиця в «Details»: 10 рядків з назвою, значенням з одиницями, статусом і джерелом', () => {
      render(<RoutePanel />);
      const details = openCoefficients();
      const table = within(details).getByRole('table', { name: 'Model coefficients and sources' });
      const rows = within(table).getAllByRole('row').slice(1);
      expect(rows).toHaveLength(10);
      expect(within(table).getByRole('row', { name: /Walking speed.*1 m\/s.*MOCK/ })).toBeInTheDocument();
      expect(within(table).getByRole('row', { name: /Reserve.*20 %/ })).toBeInTheDocument();
      expect(within(table).getByRole('row', { name: /Dose rate.*no data/ })).toBeInTheDocument();
      expect(within(table).getByRole('row', { name: /Emergency O₂ reserve.*360 g.*assumption/ })).toBeInTheDocument();
    });

    it('джерело з url — посилання з назвою джерела', () => {
      useMission.setState({ model: { ...mockModel, evidence: { ...mockModel.evidence, o2GPerS: { id: 'jones', title: 'Jones, Working on the Moon', url: 'https://www.osti.gov/servlets/purl/7168757', status: 'verified', note: '' } } } });
      render(<RoutePanel />);
      openCoefficients();
      expect(screen.getByRole('link', { name: 'Jones, Working on the Moon' })).toHaveAttribute('href', 'https://www.osti.gov/servlets/purl/7168757');
    });
  });

  it('#79: таблиця відрізків — у «Segments (N · K no return)», деталі обраного відрізка видно поза нею', async () => {
    store().toggleTarget('mock-a');
    render(<RoutePanel />);
    await userEvent.click(screen.getByRole('button', { name: 'Build route' }));
    await screen.findByText(/route found/i);

    const count = store().plan!.segments.length;
    const segments = Array.from({ length: count }, (_, i) => ({ returnS: i < 2 ? null : 100, ok: i >= 2 }));
    act(() => store().setReach({ status: 'incomplete', mask: new Uint8Array(0), returnInS: 600, deficits: [], swap: null, warnings: [], abort: { segments, pointOfNoReturnS: 0, emergencyO2G: 360 } }));

    const details = screen.getByText(`Segments (${count} · 2 no return)`).closest('details')!;
    expect(details).not.toHaveAttribute('open');
    expect(within(details).getByRole('table')).toBeInTheDocument();

    act(() => store().setSelectedSegment(0));
    expect(details).not.toContainElement(screen.getByTestId('segment-details'));
  });

  describe('Пульт EVA (планшет): маршрут під пальцем, без прокрутки', () => {
    const dock = () => screen.getByRole('region', { name: 'Route controls' });

    it('без обраного місця пульта немає', () => {
      render(<RoutePanel />);
      expect(screen.queryByRole('region', { name: 'Route controls' })).not.toBeInTheDocument();
    });

    it('з пульта: Build → план; ▶ / ◀ крокують по відрізках, межі вимикають кнопки', async () => {
      act(() => store().setSite('gale'));
      store().toggleTarget('mock-a');
      render(<RoutePanel />);
      await userEvent.click(within(dock()).getByRole('button', { name: 'Build route' }));
      await screen.findByText(/route found/i);
      const total = store().plan!.segments.length;

      expect(within(dock()).getByRole('button', { name: 'Previous segment' })).toBeDisabled();
      await userEvent.click(within(dock()).getByRole('button', { name: 'Next segment' }));
      expect(store().selectedSegment).toBe(0);
      expect(dock()).toHaveTextContent(`Segment 1 of ${total}`);

      await userEvent.click(within(dock()).getByRole('button', { name: 'Next segment' }));
      expect(store().selectedSegment).toBe(1);
      await userEvent.click(within(dock()).getByRole('button', { name: 'Previous segment' }));
      expect(store().selectedSegment).toBe(0);
    });

    it('обраний відрізок у пульті — з причиною ризику й наявністю знімка', async () => {
      act(() => store().setSite('gale'));
      store().toggleTarget('mock-a');
      render(<RoutePanel />);
      await userEvent.click(within(dock()).getByRole('button', { name: 'Build route' }));
      await screen.findByText(/route found/i);
      act(() => store().setSelectedSegment(0));
      expect(dock()).toHaveTextContent('nominal');
      expect(dock()).toHaveTextContent('no photo within 300 m');
    });

    it('без цілей — підказка, кнопка Build вимкнена', () => {
      act(() => store().setSite('gale'));
      render(<RoutePanel />);
      expect(dock()).toHaveTextContent('Choose targets to plan a route');
      expect(within(dock()).getByRole('button', { name: 'Build route' })).toBeDisabled();
    });
  });

  it('порядок цілей згорнуто в «Target order»', () => {
    store().toggleTarget('mock-a');
    store().toggleTarget('mock-c');
    render(<RoutePanel />);
    const details = screen.getByText('Target order (2)').closest('details')!;
    expect(within(details).getByRole('list', { name: 'Target order' })).toBeInTheDocument();
  });

  describe('Шторка пульта: деталі маршруту коротко', () => {
    const details = () => screen.getByRole('region', { name: 'Route details' });
    const build = async () => {
      act(() => store().setSite('gale'));
      store().toggleTarget('mock-a');
      render(<RoutePanel />);
      await userEvent.click(within(screen.getByRole('region', { name: 'Route controls' })).getByRole('button', { name: 'Build route' }));
      await screen.findByText(/route found/i);
    };
    const setAbort = (badFrom: number | null, pnr: number | null) => {
      const count = store().plan!.segments.length;
      const segments = Array.from({ length: count }, (_, i) => ({ returnS: 100, ok: badFrom === null || i < badFrom }));
      act(() => store().setReach({ status: 'incomplete', mask: new Uint8Array(0), returnInS: 600, deficits: [], swap: null, warnings: [], abort: { segments, pointOfNoReturnS: pnr, emergencyO2G: 360 } }));
    };

    it('точка неповернення одним рядком: хвилини й відрізок', async () => {
      await build();
      setAbort(2, 300);
      expect(details()).toHaveTextContent('No return after 5 min');
      expect(details()).toHaveTextContent('from segment 3');
    });

    it('повернення звідусіль — «Return possible all the way»', async () => {
      await build();
      setAbort(null, null);
      expect(details()).toHaveTextContent('Return possible all the way');
    });

    it('ноги маршруту рядками й обраний відрізок з фото-приміткою', async () => {
      await build();
      expect(within(details()).getAllByRole('listitem')).toHaveLength(store().plan!.legs.length);
      act(() => store().setSelectedSegment(0));
      expect(details()).toHaveTextContent('Segment 1');
      expect(details()).toHaveTextContent('no photo within 300 m');
    });
  });

  it('підшторка знімка: тап по мініатюрі → великий знімок з підписом; ▶ гортає далі; Close', async () => {
    act(() => store().setSite('gale'));
    store().toggleTarget('mock-a');
    render(<RoutePanel />);
    await userEvent.click(within(screen.getByRole('region', { name: 'Route controls' })).getByRole('button', { name: 'Build route' }));
    await screen.findByText(/route found/i);
    const near = store().plan!.segments[0]!.to;
    act(() => useMission.setState({ photos: [{ id: 'p1', coordinates: [near[0] + 30, near[1]], lonLat: [0, 0], url: 'photos/p1.jpg', alt: 'Navcam view of bedrock', sourceUrl: 'https://mars.nasa.gov/raw_images/1', credit: 'NASA/JPL-Caltech', sol: 3110, camera: 'NAV_LEFT_B', locationAccuracy: 'rover-stop', status: 'verified' }] }));
    act(() => store().setSelectedSegment(0));

    await userEvent.click(screen.getByRole('button', { name: 'Open photo from segment 1' }));
    const sheet = screen.getByRole('dialog', { name: 'Photo from segment 1' });
    expect(within(sheet).getByRole('img', { name: 'Navcam view of bedrock' })).toBeInTheDocument();
    expect(sheet).toHaveTextContent(/Navcam, sol 3110, ~\d+ m from this segment \(rover stop\)/);

    await userEvent.click(within(sheet).getByRole('button', { name: 'Next segment' }));
    expect(store().selectedSegment).toBe(1);
    expect(screen.getByRole('dialog', { name: 'Photo from segment 2' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Close photo' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  describe('Пульт як навігатор: повзунок по маршруту, Play, зведення по точці', () => {
    const dock = () => screen.getByRole('region', { name: 'Route controls' });
    const build = async () => {
      act(() => store().setSite('gale'));
      store().toggleTarget('mock-a');
      render(<RoutePanel />);
      await userEvent.click(within(dock()).getByRole('button', { name: 'Build route' }));
      await screen.findByText(/route found/i);
      return store().plan!;
    };

    it('повзунок: max = кількість відрізків, зміна → обраний відрізок', async () => {
      const plan = await build();
      const slider = within(dock()).getByRole('slider', { name: 'Position on route' });
      expect(slider).toHaveAttribute('max', String(plan.segments.length));
      fireEvent.change(slider, { target: { value: '5' } });
      expect(store().selectedSegment).toBe(4);
    });

    it('зведення по точці: хвилини від старту, O₂ від старту, чи можна повернутись', async () => {
      const plan = await build();
      const count = plan.segments.length;
      act(() => store().setReach({ status: 'incomplete', mask: new Uint8Array(0), returnInS: 600, deficits: [], swap: null, warnings: [],
        abort: { segments: Array.from({ length: count }, (_, i) => ({ returnS: 100, ok: i < 3 })), pointOfNoReturnS: 120, emergencyO2G: 56 } }));
      act(() => store().setSelectedSegment(1));
      const t = plan.segments[0]!.time + plan.segments[1]!.time;
      const o2 = plan.segments[0]!.o2 + plan.segments[1]!.o2;
      expect(dock()).toHaveTextContent(`${Math.floor(t / 60)} min in`);
      expect(dock()).toHaveTextContent(`${o2.toFixed(1)} g O₂ used`);
      expect(dock()).toHaveTextContent('return OK');
      act(() => store().setSelectedSegment(3));
      expect(dock()).toHaveTextContent('no return from here');
    });

    it('Play проходить маршрут сам; Pause зупиняє; ◀ ▶ теж зупиняють', async () => {
      await build();
      vi.useFakeTimers();
      try {
        fireEvent.click(within(dock()).getByRole('button', { name: 'Play route' }));
        act(() => vi.advanceTimersByTime(3 * 250));
        expect(store().selectedSegment).toBe(2);
        expect(within(dock()).getByRole('button', { name: 'Pause route' })).toBeInTheDocument();
        fireEvent.click(within(dock()).getByRole('button', { name: 'Pause route' }));
        act(() => vi.advanceTimersByTime(1000));
        expect(store().selectedSegment).toBe(2);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
