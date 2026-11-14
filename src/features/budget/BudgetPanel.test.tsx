import { beforeEach, describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { emptyPlan } from '../../core';
import { mockModel } from '../../mocks';
import { resetMission, useMission } from '../../store/useMission';
import { BudgetEngine } from './BudgetEngine';
import { BudgetPanel } from './BudgetPanel';

const store = () => useMission.getState();
const renderBudget = () =>
  render(
    <>
      <BudgetEngine />
      <BudgetPanel />
    </>,
  );

beforeEach(() => resetMission());

describe('BudgetEngine + BudgetPanel', () => {
  it('F5-AC1: у базі без цілей — «Return in 48 min», статус incomplete з текстом', () => {
    renderBudget();
    expect(screen.getByText('Return in 48 min')).toBeInTheDocument();
    expect(screen.getByText(/return not fully assessed/i)).toBeInTheDocument();
    expect(store().reach?.status).toBe('incomplete');
    expect(store().budget).toEqual({ time: 3600, o2: 720, energy: 600, dose: null });
  });

  it('«O₂ −40%» звужує запас, «Reset» повертає ліміти', async () => {
    renderBudget();
    await userEvent.click(screen.getByRole('button', { name: 'O₂ −40%' }));

    expect(store().limits.o2).toBeCloseTo(432, 6);
    expect(screen.getByRole('button', { name: 'O₂ −40%' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Return in 28 min')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(store().limits.o2).toBe(720);
    expect(screen.getByText('Return in 48 min')).toBeInTheDocument();
  });

  it('обрані цілі без чинного плану — жодного числа, «Build route» / «Calculating…»', () => {
    renderBudget();
    act(() => store().toggleTarget('mock-a'));
    expect(screen.getByText('Build route to assess return')).toBeInTheDocument();
    expect(screen.queryByText(/Return in \d+ min/)).not.toBeInTheDocument();

    act(() => store().setPlan(emptyPlan('pending', 1)));
    expect(screen.getByText('Calculating…')).toBeInTheDocument();
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

  it('дефіцит — role="alert" з назвою ресурсу', () => {
    renderBudget();
    act(() => store().setTime(3500));
    expect(screen.getByRole('alert')).toHaveTextContent(/deficit: time/i);
  });
});
