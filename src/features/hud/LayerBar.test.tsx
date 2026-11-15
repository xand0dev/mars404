// F7: шари карти — зверху, над картою: іконка + назва для кожного шару; той самий стан, що в панелі Layers (toggleLayer).
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Region } from '../../contracts';
import { mockGrid } from '../../mocks';
import { resetMission, useMission } from '../../store/useMission';
import { LayerBar } from './LayerBar';

const region: Region = JSON.parse(readFileSync('public/data/gale/region.json', 'utf-8'));

function loaded() {
  act(() => {
    useMission.getState().setSite('gale');
    useMission.getState().setRegionData({ region, grid: mockGrid, targets: [] });
  });
}

beforeEach(() => resetMission());
afterEach(() => resetMission());

describe('LayerBar · шари карти зверху', () => {
  it('Given район не відкрито, Then панелі шарів немає', () => {
    render(<LayerBar />);
    expect(screen.queryByRole('toolbar', { name: 'Map layers' })).toBeNull();
  });

  it('Given район Gale, Then кожен шар — кнопка з іконкою й назвою', () => {
    loaded();
    render(<LayerBar />);
    const bar = screen.getByRole('toolbar', { name: 'Map layers' });
    const buttons = within(bar).getAllByRole('button');
    expect(buttons).toHaveLength(region.layers.length);
    for (const layer of region.layers) {
      const btn = within(bar).getByRole('button', { name: layer.name });
      expect(btn.querySelector('svg[aria-hidden="true"]'), `іконка ${layer.id}`).not.toBeNull();
      expect(btn).toHaveTextContent(layer.name);
      expect(btn).toHaveAttribute('aria-pressed', 'false');
    }
  });

  it('When клік по шару, Then перемикає той самий стан, що й панель Layers', () => {
    loaded();
    render(<LayerBar />);
    const slope = screen.getByRole('button', { name: 'Slope (derived)' });
    fireEvent.click(slope);
    expect(useMission.getState().layers.slope).toBe(true);
    expect(slope).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(slope);
    expect(useMission.getState().layers.slope).toBe(false);
    expect(slope).toHaveAttribute('aria-pressed', 'false');
  });

  it('Given шар увімкнено в панелі Layers, Then кнопка зверху теж увімкнена', () => {
    loaded();
    act(() => useMission.getState().toggleLayer('thermal'));
    render(<LayerBar />);
    expect(screen.getByRole('button', { name: 'Thermal IR night (THEMIS)' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('Given дані не того району (ще вантажиться), Then панелі немає', () => {
    loaded();
    act(() => useMission.getState().setSite('columbia-hills'));
    render(<LayerBar />);
    expect(screen.queryByRole('toolbar', { name: 'Map layers' })).toBeNull();
  });
});
