import { beforeEach, describe, expect, it } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Annotation, XY } from '../../contracts';
import { cellCenter, xyToCell } from '../../contracts/planning';
import { mockGrid, mockTargets } from '../../mocks';
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
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
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
});
