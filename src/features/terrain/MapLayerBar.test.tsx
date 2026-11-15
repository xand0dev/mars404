// Шари карти — одна смуга іконок поверх карти (замість двох після #146 і #151): той самий стан, що в панелі Layers.
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Region } from '../../contracts';
import { mockGrid } from '../../mocks';
import { resetMission, useMission } from '../../store/useMission';
import { MapLayerBar } from './MapLayerBar';

const region: Region = JSON.parse(readFileSync('public/data/gale/region.json', 'utf-8'));

beforeEach(() => resetMission());
afterEach(() => resetMission());

describe('MapLayerBar', () => {
  it('Given район не відкрито, Then смуги немає', () => {
    render(<MapLayerBar />);
    expect(screen.queryByRole('toolbar', { name: 'Map layers' })).toBeNull();
  });

  it('Given Gale, Then кнопка з іконкою на кожен шар, крім рельєфу; клік вмикає шар і показує легенду', () => {
    act(() => {
      useMission.getState().setSite('gale');
      useMission.getState().setRegionData({ region, grid: mockGrid, targets: [] });
    });
    render(<MapLayerBar />);
    const bar = screen.getByRole('toolbar', { name: 'Map layers' });
    const buttons = within(bar).getAllByRole('button');
    expect(buttons).toHaveLength(region.layers.filter((l) => l.id !== 'terrain').length);
    buttons.forEach((b) => expect(b.querySelector('svg')).not.toBeNull());
    fireEvent.click(within(bar).getByRole('button', { name: /Night IR/ }));
    expect(useMission.getState().layers.thermal).toBe(true);
    expect(screen.getByText('Thermal IR night (THEMIS)')).toBeInTheDocument();
  });
});
