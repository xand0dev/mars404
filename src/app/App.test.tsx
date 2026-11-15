import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { resetMission, useMission } from '../store/useMission';
import * as globe from '../features/globe';
import * as terrain from '../features/terrain';
import * as data from '../features/data';
import * as route from '../features/route';
import * as budget from '../features/budget';
import * as science from '../features/science';
import * as hud from '../features/hud';
import * as ui from '../ui';
import * as notes from '../features/notes';
import * as prep from '../features/prep';

beforeEach(() => resetMission());

describe('F0 · композиція', () => {
  it('кожна фіча експортує імена з SPEC §5.2', () => {
    const fn = 'function';
    expect([typeof globe.GlobeScene, typeof globe.SitePanel]).toEqual([fn, fn]);
    expect([typeof terrain.MapView, typeof terrain.CameraModes]).toEqual([fn, fn]);
    expect([typeof data.DataLoader, typeof data.LayersPanel]).toEqual([fn, fn]);
    expect(typeof route.RoutePanel).toBe(fn);
    expect([typeof budget.BudgetEngine, typeof budget.BudgetPanel]).toEqual([fn, fn]);
    expect([typeof science.TargetsPanel, typeof science.TargetCard]).toEqual([fn, fn]);
    expect([typeof hud.Shell, typeof hud.Hud]).toEqual([fn, fn]);
    expect([typeof notes.NotesPanel, typeof prep.ChecklistPanel]).toEqual([fn, fn]);
    expect([typeof ui.Panel, typeof ui.Gauge, typeof ui.StatusNote, typeof ui.OwnerBadge, typeof ui.MockBadge]).toEqual([fn, fn, fn, fn, fn]);
  });

  it('глобус: лише глобус і Location, панелі планування й HUD сховані', () => {
    const { container } = render(<App />);
    expect(screen.getByRole('region', { name: 'Mars globe' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Location' })).toBeInTheDocument();
    for (const name of ['HUD', 'Layers', 'Science targets', 'Route', 'Navigation', 'Resources']) {
      expect(screen.queryByRole('region', { name }), name).toBeNull();
    }
    expect(screen.queryByRole('group', { name: 'Camera mode' })).toBeNull();
    expect(container.querySelector('.shell__hud')).toBeEmptyDOMElement();
    expect(screen.getByText(/Demonstration model, not certified navigation/)).toBeInTheDocument();
  });

  it('F0-AC1: після вибору EVA-району всі слоти видно з бейджем MOCK і власником', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole('button', { name: 'Gale / Mount Sharp' }));
    expect(container.querySelector('.shell__hud')).not.toBeEmptyDOMElement();
    for (const name of ['HUD', 'Location', 'Layers', 'Science targets', 'Route', 'Resources']) {
      const region = screen.getByRole('region', { name });
      expect(within(region).getByText('MOCK')).toBeInTheDocument();
    }
    expect(screen.getAllByText(/F2 · Олександр/).length).toBeGreaterThan(0);
  });

  it('без WebGL полотно показує 2D-план Б, а не порожнечу', () => {
    render(<App />);
    expect(screen.getByRole('img', { name: '2D plan B' })).toBeInTheDocument();
  });

  it('Gale → цілі → waypoints ідуть через store', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Gale / Mount Sharp' }));
    expect(useMission.getState().site).toBe('gale');
    expect(screen.getByRole('region', { name: 'Gale terrain' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Add MOCK Site A/ }));
    expect(useMission.getState().waypoints).toHaveLength(1);
    expect(screen.getByText(/1 waypoint\(s\) selected/)).toBeInTheDocument();
  });
});
