// F3-AC3, F3-AC4: панель шарів — перемикачі (миша, клавіатура), легенда текстом, одиниці, походження, помилка шару.
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Region } from '../../contracts';
import { mockGrid } from '../../mocks';
import { resetMission, useMission } from '../../store/useMission';
import { resetDataStatus, useDataStatus } from './dataStatus';
import { LayersPanel } from './LayersPanel';

const region: Region = JSON.parse(readFileSync('public/data/gale/region.json', 'utf-8'));
const AC3_LAYERS = ['terrain', 'optical', 'thermal', 'slope', 'traverse'];

function loaded() {
  act(() => {
    useMission.getState().setSite('gale');
    useMission.getState().setRegionData({ region, grid: mockGrid, targets: [] });
    useDataStatus.setState({ phase: 'real', issues: [], warnings: [] });
  });
}

beforeEach(() => {
  resetMission();
  resetDataStatus();
});
afterEach(() => {
  resetMission();
  resetDataStatus();
});

describe('LayersPanel', () => {
  it('Given район не відкрито, Then MOCK і підказка', () => {
    render(<LayersPanel />);
    expect(screen.getByText('MOCK')).toBeInTheDocument();
    expect(screen.getByText(/open a site/i)).toBeInTheDocument();
  });

  it('F3-AC3: Given панель, Then 5 шарів AC мають кнопку, легенду текстом, одиниці й походження', () => {
    loaded();
    render(<LayersPanel />);
    for (const id of AC3_LAYERS) {
      const layer = region.layers.find((l) => l.id === id)!;
      const item = screen.getByTestId(`layer-${id}`);
      const q = within(item);
      expect(q.getByRole('button', { name: new RegExp(layer.name.replace(/[()]/g, '.')) })).toHaveAttribute('aria-pressed', 'false');
      for (const s of layer.legend) expect(q.getByText(s.label)).toBeInTheDocument();
      expect(q.getByText(new RegExp(`Units: ${layer.units.replace(/[()]/g, '.')}`))).toBeInTheDocument();
      const prov = q.getByTestId('provenance').textContent ?? '';
      const src = region.sources.find((s) => s.id === layer.sourceIds[0])!;
      expect(prov).toContain(src.productId ?? src.url ?? '');
      expect(prov).toContain(`→ grid ${region.grid.metersPerPixel} m`);
      expect(prov).toContain(layer.nativeResolutionM === null ? 'native n/a' : `native ${layer.nativeResolutionM} m`);
      expect(prov).toContain(layer.method);
      if (src.credit) expect(prov).toContain(src.credit);
      expect(q.getByText(layer.status)).toBeInTheDocument();
    }
  });

  it('F3-AC3: When клік мишею, Then toggleLayer і aria-pressed', async () => {
    loaded();
    render(<LayersPanel />);
    const btn = within(screen.getByTestId('layer-thermal')).getByRole('button');
    await userEvent.click(btn);
    expect(useMission.getState().layers.thermal).toBe(true);
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(btn);
    expect(useMission.getState().layers.thermal).toBe(false);
  });

  it('F3-AC3: When Tab + Enter / Space, Then перемикається з клавіатури', async () => {
    loaded();
    render(<LayersPanel />);
    const btn = within(screen.getByTestId('layer-terrain')).getByRole('button');
    await userEvent.tab();
    expect(btn).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(useMission.getState().layers.terrain).toBe(true);
    await userEvent.keyboard(' ');
    expect(useMission.getState().layers.terrain).toBe(false);
  });

  it('F3-AC4: Given помилка thermal, Then видно помилку саме цього шару, решта перемикається', async () => {
    loaded();
    act(() => useDataStatus.setState({ issues: [{ id: 'thermal', file: 'layers/themis-night.png', message: 'file missing' }] }));
    render(<LayersPanel />);
    const thermal = within(screen.getByTestId('layer-thermal'));
    expect(thermal.getByText(/layers\/themis-night\.png: file missing/)).toBeInTheDocument();
    expect(thermal.getByRole('button')).toBeDisabled();
    expect(within(screen.getByTestId('layer-slope')).queryByText(/file missing/)).toBeNull();
    await userEvent.click(within(screen.getByTestId('layer-slope')).getByRole('button'));
    expect(useMission.getState().layers.slope).toBe(true);
  });

  it('F3-AC4: Given бита сітка, Then MOCK і причина', () => {
    act(() => {
      useMission.getState().setSite('gale');
      useDataStatus.setState({ phase: 'mock', reason: 'planning grid is broken (elevation)', issues: [{ id: 'terrain', file: 'elevation.f32', message: 'file missing' }], warnings: [] });
    });
    render(<LayersPanel />);
    expect(screen.getByText('MOCK')).toBeInTheDocument();
    expect(screen.getByText(/planning grid is broken/)).toBeInTheDocument();
    expect(screen.getByText(/elevation\.f32: file missing/)).toBeInTheDocument();
  });

  it('Given реальна сітка, Then рядок про сітку зі статусом словом', () => {
    loaded();
    render(<LayersPanel />);
    const g = mockGrid;
    expect(screen.getByText(`Real grid ${g.width}×${g.height} · ${g.metersPerPixel} m/cell · verified`, { exact: false })).toBeInTheDocument();
  });
});
