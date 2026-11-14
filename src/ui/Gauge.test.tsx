import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Gauge } from './Gauge';
import { STATUS_ICON } from './statusLevel';

// Еталон SPEC §7.4: limits.o2 = 720 г, reserveFraction 0.2 → резерв 144 г; план 180 г.
// Дефіцит Gauge не рахує: його передає F5 з reach.deficits (одне джерело чисел, SPEC §5.2).
describe('F7 · Gauge — старі пропи не ламаються', () => {
  it('без reserve / need / deficit поводиться як раніше', () => {
    render(<Gauge label="O₂" value={576} max={720} unit="g" />);
    expect(screen.getByText('O₂: 576 g')).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: 'O₂' })).toHaveAttribute('value', '576');
  });

  it('null / NaN → «no data» з іконкою, без шкали (невідоме ≠ безпечно)', () => {
    for (const v of [null, NaN]) {
      const { unmount } = render(<Gauge label="Dose" value={v} max={1} unit="µSv" />);
      expect(screen.getByText(/Dose: no data/)).toBeInTheDocument();
      expect(screen.getByText(STATUS_ICON.warn)).toBeInTheDocument();
      expect(screen.queryByRole('meter')).toBeNull();
      expect(document.body.textContent).not.toMatch(/NaN/);
      unmount();
    }
  });
});

describe('F7 · Gauge — резерв, план і дефіцит від F5', () => {
  it('показує резерв і план текстом, позначка резерву на шкалі', () => {
    const { container } = render(<Gauge label="O₂" value={720} max={720} unit="g" reserve={144} need={180} />);
    expect(screen.getByText(/reserve 144 g/)).toBeInTheDocument();
    expect(screen.getByText(/plan 180 g/)).toBeInTheDocument();
    const mark = container.querySelector('.ui-gauge__reserve') as HTMLElement;
    expect(mark.style.left).toBe('20%');
  });

  it('сам дефіцит не рахує: need > value − reserve без deficit → без дефіциту', () => {
    const { container } = render(<Gauge label="O₂" value={300} max={720} unit="g" reserve={144} need={180} />);
    expect(screen.queryByText(/Deficit/)).toBeNull();
    expect(container.querySelector('.ui-gauge--deficit')).toBeNull();
  });

  it('deficit від F5 → іконка + слово, без власного role="alert" (alert — у статусі панелі)', () => {
    const { container } = render(<Gauge label="O₂" value={300} max={720} unit="g" reserve={144} need={180} deficit />);
    const note = screen.getByText(/Deficit: O₂/).closest('p') as HTMLElement;
    expect(note).toHaveTextContent(STATUS_ICON.deficit);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(container.querySelector('.ui-gauge--deficit')).not.toBeNull();
  });

  it('невідомий value з deficit → усе одно «no data» + дефіцит словами', () => {
    render(<Gauge label="Dose" value={null} max={1} unit="µSv" deficit />);
    expect(screen.getByText(/Dose: no data/)).toBeInTheDocument();
    expect(screen.getByText(/Deficit: Dose/)).toBeInTheDocument();
  });

  it('NaN у reserve / need не потрапляє в текст', () => {
    render(<Gauge label="Dose" value={50} max={100} unit="µSv" reserve={NaN} need={null} />);
    expect(screen.getByText('Dose: 50 µSv')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/NaN/);
  });
});
