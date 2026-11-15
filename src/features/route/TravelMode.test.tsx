import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { RoutePlan } from '../../contracts';
import { ROVER } from '../../core';
import { RoverNote } from './TravelMode';

const planOf = (dist: number) => ({ status: 'ok', totals: { dist, time: 1, o2: 1, energy: 0, dose: null } }) as unknown as RoutePlan;

describe('RoverNote', () => {
  it('Given батареї вистачає, Then витрата як інформація, штрафи схилу й ґрунту позначено assumption', () => {
    render(<RoverNote plan={planOf(1000)} />);
    expect(screen.getByText(/rover battery: 132 Wh of 8712 Wh/i)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText(/slope and soil penalties as for walking/i)).toBeInTheDocument();
  });

  it('Given маршрут довший за батарею ровера, Then alert «exceeds the rover battery»', () => {
    render(<RoverNote plan={planOf((ROVER.batteryWh / ROVER.energyWhPerM) * 1.1)} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/exceeds the rover battery/i);
  });
});
