import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetMission, useMission } from '../../store/useMission';
import { SitePanel } from './SitePanel';
import { resetGlobe, useGlobe } from './globeState';
import { SITES, type Site } from './sites';
import { chooseSite } from './choose';
import { FLY_MS } from './motion';
import { ZOOM_MIN, ZOOM_STEP, resetZoom, useZoom } from './zoom';

beforeEach(() => {
  resetMission();
  resetGlobe();
});

const galeButton = () => screen.getByRole('button', { name: 'Gale / Mount Sharp' });

describe('F1-AC1 · вибір Gale', () => {
  it('Given site = null; When клік мишею; Then setSite("gale") і маркер Gale активний', async () => {
    const user = userEvent.setup();
    render(<SitePanel />);
    expect(galeButton()).toHaveAttribute('aria-pressed', 'false');
    await user.click(galeButton());
    expect(useMission.getState().site).toBe('gale');
    expect(galeButton()).toHaveAttribute('aria-pressed', 'true');
  });

  it.each([['Enter', '{Enter}'], ['Space', ' ']])('Given site = null; When %s з клавіатури; Then site = "gale"', async (_, key) => {
    const user = userEvent.setup();
    render(<SitePanel />);
    galeButton().focus();
    await user.keyboard(key);
    expect(useMission.getState().site).toBe('gale');
  });

  it('When обрано Gale після картки іншої точки; Then картку закрито', async () => {
    const user = userEvent.setup();
    render(<SitePanel />);
    await user.click(screen.getByRole('button', { name: 'Jezero' }));
    await user.click(galeButton());
    expect(useGlobe.getState().previewId).toBeNull();
    expect(screen.queryByRole('region', { name: 'Jezero' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Gale / Mount Sharp' })).getByText('EVA site — plan a route')).toBeInTheDocument();
  });
});

describe('#105 · EVA і Overview з глобуса', () => {
  it.each([
    ['Columbia Hills (Gusev)', 'columbia-hills', 'EVA site — plan a route'],
    ['Olympus Mons', 'olympus-mons', 'Overview — terrain only, no EVA planning'],
    ['Valles Marineris', 'valles-marineris', 'Overview — terrain only, no EVA planning'],
  ])('Given site = null; When обрано %s; Then setSite("%s") і картка «%s»', async (name, id, label) => {
    const user = userEvent.setup();
    render(<SitePanel />);
    await user.click(screen.getByRole('button', { name }));
    expect(useMission.getState().site).toBe(id);
    expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByRole('region', { name })).getByText(label)).toBeInTheDocument();
  });

  it('Given сцена, без reduced motion; When обрано Columbia Hills; Then переліт, setSite після FLY_MS', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    useGlobe.getState().setSceneReady(true);
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<SitePanel />);
      await user.click(screen.getByRole('button', { name: 'Columbia Hills (Gusev)' }));
      expect(useMission.getState().site).toBeNull();
      expect(screen.getByText(/Flying to Columbia Hills/)).toBeInTheDocument();
      act(() => vi.advanceTimersByTime(FLY_MS));
      expect(useMission.getState().site).toBe('columbia-hills');
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  it('Given точка «coming soon»; Then кнопка вимкнена, chooseSite нічого не робить', async () => {
    const i = SITES.findIndex((s) => s.id === 'olympus-mons');
    const orig = SITES[i]!;
    (SITES as Site[])[i] = { ...orig, comingSoon: true };
    try {
      render(<SitePanel />);
      const btn = screen.getByRole('button', { name: 'Olympus Mons' });
      expect(btn).toBeDisabled();
      expect(btn).toHaveAccessibleDescription(/Coming soon/);
      chooseSite('olympus-mons');
      expect(useMission.getState().site).toBeNull();
      expect(useGlobe.getState().flying).toBe(false);
      expect(useGlobe.getState().previewId).toBeNull();
    } finally {
      (SITES as Site[])[i] = orig;
    }
  });

  it('кожна кнопка має режим у описі (не лише колір / форма)', () => {
    render(<SitePanel />);
    for (const s of SITES) expect(screen.getByRole('button', { name: s.name })).toHaveAccessibleDescription(/EVA site|Overview|Card only/);
  });
});

describe('F1-AC2 · не-Gale точки', () => {
  const others = SITES.filter((s) => s.mode === 'card');

  it.each(others.map((s) => [s.name, s] as const))('Given панель; When обрано %s; Then опис і «Card only», site не змінюється', async (name, s) => {
    const user = userEvent.setup();
    render(<SitePanel />);
    await user.click(screen.getByRole('button', { name }));
    const card = screen.getByRole('region', { name });
    expect(within(card).getByText(s.summary)).toBeInTheDocument();
    expect(within(card).getByText(/Card only/)).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: /IAU Gazetteer/ })).toHaveAttribute('href', s.source.url);
    expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'true');
    expect(useMission.getState().site).toBeNull();
  });

  it('Given відкрито Gale; When обрано Jezero; Then site лишається "gale"', async () => {
    const user = userEvent.setup();
    useMission.getState().setSite('gale');
    render(<SitePanel />);
    await user.click(screen.getByRole('button', { name: 'Jezero' }));
    expect(within(screen.getByRole('region', { name: 'Jezero' })).getByText(/Card only/)).toBeInTheDocument();
    expect(useMission.getState().site).toBe('gale');
  });
});

describe('F1-AC5 · Back to globe', () => {
  it('Given site = null; Then кнопки «Back to globe» немає', () => {
    render(<SitePanel />);
    expect(screen.queryByRole('button', { name: 'Back to globe' })).not.toBeInTheDocument();
  });

  it('Given район Gale відкрито й є стан; When «Back to globe»; Then setSite(null) і стан скинуто', async () => {
    const user = userEvent.setup();
    useMission.getState().setSite('gale');
    useMission.setState({ selectedTargetIds: ['x'], time: 120 });
    useGlobe.getState().preview('jezero');
    render(<SitePanel />);
    await user.click(screen.getByRole('button', { name: 'Back to globe' }));
    const s = useMission.getState();
    expect(s.site).toBeNull();
    expect(s.selectedTargetIds).toEqual([]);
    expect(s.time).toBe(0);
    expect(useGlobe.getState().previewId).toBeNull();
    expect(galeButton()).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('F1-AC4 · підпис текстури / MOCK', () => {
  it('Given текстура не завантажена; Then панель з «MOCK» і підписом процедурної сфери, кнопки працюють', async () => {
    const user = userEvent.setup();
    useGlobe.getState().setTexture({ status: 'missing' });
    render(<SitePanel />);
    const panel = screen.getByRole('region', { name: 'Location' });
    expect(within(panel).getByText('MOCK')).toBeInTheDocument();
    expect(within(panel).getByText(/procedural sphere/i)).toBeInTheDocument();
    await user.click(galeButton());
    expect(useMission.getState().site).toBe('gale');
  });

  it('Given текстура ще вантажиться (район відкрили швидко); Then без «MOCK», підпис «loading»', () => {
    useGlobe.getState().setTexture({ status: 'loading' });
    render(<SitePanel />);
    const panel = screen.getByRole('region', { name: 'Location' });
    expect(within(panel).queryByText('MOCK')).not.toBeInTheDocument();
    expect(within(panel).getByText(/Globe texture loading/)).toBeInTheDocument();
  });

  it('Given текстуру завантажено; Then видно підпис джерела, без «MOCK»', () => {
    useGlobe.getState().setTexture({ status: 'ok', credit: 'TEST CREDIT' });
    render(<SitePanel />);
    const panel = screen.getByRole('region', { name: 'Location' });
    expect(within(panel).getByText(/Texture: TEST CREDIT/)).toBeInTheDocument();
    expect(within(panel).queryByText('MOCK')).not.toBeInTheDocument();
  });
});

describe('F1-AC3 · перехід до Gale: анімація, Skip, reduced motion', () => {
  const reduced = (matches: boolean) =>
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q === '(prefers-reduced-motion: reduce)' && matches }));

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    useGlobe.getState().setSceneReady(true);
    reduced(false);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  const setup = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

  it('Given сцена є, без reduced motion; When обрано Gale; Then спершу анімація зі «Skip», site — після FLY_MS', async () => {
    const user = setup();
    render(<SitePanel />);
    await user.click(galeButton());
    expect(useMission.getState().site).toBeNull();
    expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
    expect(useGlobe.getState().flying).toBe(true);
    act(() => vi.advanceTimersByTime(FLY_MS));
    expect(useMission.getState().site).toBe('gale');
    expect(useGlobe.getState().flying).toBe(false);
    expect(screen.queryByRole('button', { name: 'Skip' })).not.toBeInTheDocument();
  });

  it('Given увімкнено reduced motion; When обрано Gale; Then район відкривається одразу, без анімації', async () => {
    reduced(true);
    const user = setup();
    render(<SitePanel />);
    await user.click(galeButton());
    expect(useMission.getState().site).toBe('gale');
    expect(useGlobe.getState().flying).toBe(false);
    expect(screen.queryByRole('button', { name: 'Skip' })).not.toBeInTheDocument();
  });

  it('Given анімація йде; When «Skip»; Then район одразу, а таймер більше не пише в store', async () => {
    const user = setup();
    render(<SitePanel />);
    await user.click(galeButton());
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    expect(useMission.getState().site).toBe('gale');
    await user.click(screen.getByRole('button', { name: 'Back to globe' }));
    act(() => vi.advanceTimersByTime(FLY_MS * 2));
    expect(useMission.getState().site).toBeNull();
  });

  it('Given сцени немає (без WebGL); When обрано Gale; Then одразу', async () => {
    useGlobe.getState().setSceneReady(false);
    const user = setup();
    render(<SitePanel />);
    await user.click(galeButton());
    expect(useMission.getState().site).toBe('gale');
  });

  it('Given анімація йде; When обрано Jezero; Then перехід скасовано, site лишається null', async () => {
    const user = setup();
    render(<SitePanel />);
    await user.click(galeButton());
    await user.click(screen.getByRole('button', { name: 'Jezero' }));
    act(() => vi.advanceTimersByTime(FLY_MS * 2));
    expect(useMission.getState().site).toBeNull();
    expect(useGlobe.getState().flying).toBe(false);
  });
});

describe('#5 · доступність Location (аудит F7-AC2)', () => {
  it('Given панель; When Tab по черзі; Then кожна точка — кнопка, досяжна без canvas і без обертання глобуса', async () => {
    const user = userEvent.setup();
    render(<SitePanel />);
    for (const s of SITES) {
      await user.tab();
      expect(screen.getByRole('button', { name: s.name })).toHaveFocus();
    }
  });

  it.each(SITES.filter((s) => s.mode === 'card').map((s) => [s.name] as const))(
    'Given фокус на %s; When Enter; Then картка «next site» читається як текст, site не змінюється',
    async (name) => {
      const user = userEvent.setup();
      render(<SitePanel />);
      screen.getByRole('button', { name }).focus();
      await user.keyboard('{Enter}');
      const card = screen.getByRole('region', { name });
      expect(within(card).getByText(/Card only/)).toBeInTheDocument();
      expect(useMission.getState().site).toBeNull();
    },
  );
});

describe('#80 · кнопки масштабу', () => {
  const zoomBtn = (name: string) => screen.getByRole('button', { name });
  beforeEach(() => {
    resetZoom();
    useGlobe.setState({ sceneReady: true });
  });

  it('Given глобус (site = null) і сцена; Then є Zoom in / Zoom out / Reset view', () => {
    render(<SitePanel />);
    for (const n of ['Zoom in', 'Zoom out', 'Reset view']) expect(zoomBtn(n)).toBeInTheDocument();
  });

  it('When Enter на Zoom in, Space на Zoom out, Reset view; Then масштаб змінюється й скидається', async () => {
    const user = userEvent.setup();
    render(<SitePanel />);
    zoomBtn('Zoom in').focus();
    await user.keyboard('{Enter}');
    await user.keyboard('{Enter}');
    expect(useZoom.getState().zoom).toBeCloseTo(ZOOM_STEP * ZOOM_STEP);
    zoomBtn('Zoom out').focus();
    await user.keyboard(' ');
    expect(useZoom.getState().zoom).toBeCloseTo(ZOOM_STEP);
    await user.click(zoomBtn('Reset view'));
    expect(useZoom.getState().zoom).toBe(1);
  });

  it('на межах кнопки вимкнено: мінімум — Zoom out, верхня межа камери — Zoom in', () => {
    useZoom.setState({ zoom: ZOOM_MIN });
    const { rerender } = render(<SitePanel />);
    expect(zoomBtn('Zoom out')).toBeDisabled();
    act(() => useZoom.getState().setMaxZoom(1.2));
    act(() => useZoom.getState().zoomBy(10));
    rerender(<SitePanel />);
    expect(zoomBtn('Zoom in')).toBeDisabled();
    expect(zoomBtn('Zoom out')).toBeEnabled();
  });

  it('Given відкрито Gale або немає сцени (WebGL); Then кнопок масштабу немає', () => {
    useMission.getState().setSite('gale');
    const { unmount } = render(<SitePanel />);
    expect(screen.queryByRole('button', { name: 'Zoom in' })).toBeNull();
    unmount();
    useMission.getState().setSite(null);
    useGlobe.setState({ sceneReady: false });
    render(<SitePanel />);
    expect(screen.queryByRole('button', { name: 'Zoom in' })).toBeNull();
  });
});

describe('глобус → район: сторінка на початок', () => {
  it('відкриття району прокручує на початок; на глобусі — ні', () => {
    const spy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    render(<SitePanel />);
    expect(spy).not.toHaveBeenCalled();
    act(() => useMission.getState().setSite('gale'));
    expect(spy).toHaveBeenCalledWith({ top: 0 });
    spy.mockRestore();
  });
});
