import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { cellCenter } from '../../contracts/planning';
import { mockGrid, mockTargets } from '../../mocks';
import { resetMission, useMission } from '../../store/useMission';
import { RoutePanel } from './RoutePanel';

const store = () => useMission.getState();

beforeEach(() => resetMission());

describe('RoutePanel', () => {
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

    await userEvent.click(screen.getByRole('button', { name: 'Select segment 3' }));

    expect(store().selectedSegment).toBe(2);
    const details = screen.getByTestId('segment-details');
    for (const unit of [' m', '°', ' s', ' g O₂', ' Wh', 'dose no data']) expect(details).toHaveTextContent(unit);
  });

  it('таблиця — одна зупинка Tab, далі стрілки (сотні відрізків не забивають клавіатуру)', async () => {
    store().toggleTarget('mock-a');
    render(<RoutePanel />);
    await userEvent.click(screen.getByRole('button', { name: 'Build route' }));
    await screen.findByText(/route found/i);

    const rowButtons = screen.getAllByRole('button', { name: /^Select segment \d+$/ });
    expect(rowButtons.filter((b) => b.tabIndex === 0)).toHaveLength(1);

    rowButtons[0]!.focus();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(store().selectedSegment).toBe(2);
    expect(screen.getByRole('button', { name: 'Select segment 3' })).toHaveFocus();

    await userEvent.keyboard('{End}');
    expect(store().selectedSegment).toBe(rowButtons.length - 1);
  });
});
