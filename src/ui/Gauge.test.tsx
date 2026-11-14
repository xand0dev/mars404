import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Gauge } from './Gauge';
import { gaugeLevel } from './gaugeLevel';
import { STATUS_ICON } from './statusLevel';

// Еталон SPEC §7.4: limits.o2 = 720 г, reserveFraction 0.2 → резерв 144 г; план 180 г.
describe('F7 · Gauge — старі пропи не ламаються', () => {
  it('без reserve / need поводиться як раніше', () => {
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

describe('F7 · Gauge — резерв і план (SPEC §7.4)', () => {
  it('показує резерв і план текстом, позначка резерву на шкалі', () => {
    const { container } = render(<Gauge label="O₂" value={720} max={720} unit="g" reserve={144} need={180} />);
    expect(screen.getByText(/reserve 144 g/)).toBeInTheDocument();
    expect(screen.getByText(/plan 180 g/)).toBeInTheDocument();
    const mark = container.querySelector('.ui-gauge__reserve') as HTMLElement;
    expect(mark.style.left).toBe('20%');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('рівність допустима: value − reserve = need → без дефіциту', () => {
    expect(gaugeLevel(324, 144, 180)).toBe('ok');
  });

  it('план більший за запас понад резерв → дефіцит: іконка + слово + alert', () => {
    // сценарій O₂ −40%: 432 − 86.4 = 345.6 ≥ 180 — ок; а 300 − 144 = 156 < 180 — дефіцит
    expect(gaugeLevel(432, 86.4, 180)).toBe('ok');
    render(<Gauge label="O₂" value={300} max={720} unit="g" reserve={144} need={180} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(STATUS_ICON.deficit);
    expect(alert).toHaveTextContent('Deficit: O₂');
  });

  it('запас нижче резерву без плану → теж дефіцит', () => {
    expect(gaugeLevel(100, 144, null)).toBe('deficit');
  });

  it('невідомий резерв / план не робить шкалу «ок» і не ламає текст', () => {
    expect(gaugeLevel(null, 144, 180)).toBe('unknown');
    render(<Gauge label="Dose" value={50} max={100} unit="µSv" reserve={NaN} need={null} />);
    expect(screen.getByText('Dose: 50 µSv')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/NaN/);
  });
});
