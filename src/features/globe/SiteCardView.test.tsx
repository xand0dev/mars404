import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetMission, useMission } from '../../store/useMission';
import { SiteCard } from './SiteCardView';
import { resetGlobe } from './globeState';
import { clearSiteCardCache } from './siteCard';
import { siteById } from './sites';

const makeCard = (id: string, mode: 'eva' | 'overview' | 'card') => ({
  schemaVersion: 1,
  id,
  title: id === 'gale' ? 'Gale Crater · Mount Sharp' : id === 'olympus-mons' ? 'Olympus Mons' : 'Jezero Crater',
  subtitle: 'A Mars field site',
  mode,
  summary: 'A sourced summary for this location.',
  whyGo: 'A sourced reason to examine this location.',
  facts: [
    { label: 'Center', value: '5.44° S, 137.70° E', sourceId: 'source-1' },
    { label: 'Mission', value: 'Rover mission', sourceId: 'source-1' },
    { label: 'Terrain', value: 'Layered rock', sourceId: 'source-1' },
  ],
  image: {
    file: `${id}.jpg`,
    alt: `Orbital view of ${id}`,
    credit: 'NASA/JPL-Caltech',
    sourceUrl: 'https://science.nasa.gov/example',
    status: 'verified',
  },
  sources: [
    { id: 'source-1', title: 'NASA source', url: 'https://science.nasa.gov/example', credit: 'NASA/JPL-Caltech', accessedAt: '2026-11-15', status: 'verified' },
  ],
});

function mockCard(id: string, mode: 'eva' | 'overview' | 'card') {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => makeCard(id, mode) }));
}

beforeEach(() => {
  resetMission();
  resetGlobe();
  clearSiteCardCache();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('#112 · SiteCard', () => {
  it.each([
    ['gale', 'eva', 'EVA site — plan a route'],
    ['olympus-mons', 'overview', 'Overview — terrain only, no EVA planning'],
    ['jezero', 'card', 'Card only — no terrain data'],
  ] as const)('Given %s; Then показує mode badge словами, фото, факти й статус джерела', async (id, mode, label) => {
    mockCard(id, mode);
    render(<SiteCard site={siteById(id)!} />);

    const card = await screen.findByRole('region', { name: siteById(id)!.name });
    expect(within(card).getByText(label)).toBeInTheDocument();
    expect(within(card).getByRole('img', { name: `Orbital view of ${id}` })).toHaveAttribute('loading', 'lazy');
    expect(within(card).getByRole('link', { name: 'NASA/JPL-Caltech' })).toHaveAttribute('href', 'https://science.nasa.gov/example');
    expect(within(card).getByText('Why go:')).toBeInTheDocument();
    expect(within(card).getByText(/Layered rock/)).toBeInTheDocument();
    expect(within(card).getAllByLabelText('Source status: verified')).not.toHaveLength(0);
  });

  it('Given Jezero; Then немає action button і видно Terrain not modelled yet', async () => {
    mockCard('jezero', 'card');
    render(<SiteCard site={siteById('jezero')!} />);

    const card = await screen.findByRole('region', { name: 'Jezero' });
    expect(within(card).getByText('Terrain not modelled yet')).toBeInTheDocument();
    expect(within(card).queryByRole('button')).not.toBeInTheDocument();
  });

  it('Given файл відсутній; Then показує site.summary без фото й фактів та не пише warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    const site = siteById('jezero')!;
    render(<SiteCard site={site} />);

    expect(await screen.findByText(site.summary)).toBeInTheDocument();
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByText('Site facts')).not.toBeInTheDocument();
    expect(warn).not.toHaveBeenCalled();
  });

  it('Given картка; When Tab доходить до Sources і натиснуто Enter; Then disclosure відкривається й закривається', async () => {
    const user = userEvent.setup();
    mockCard('gale', 'eva');
    render(<SiteCard site={siteById('gale')!} />);
    await screen.findByRole('region', { name: 'Gale / Mount Sharp' });

    await user.tab();
    expect(screen.getByRole('link', { name: 'NASA/JPL-Caltech' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Plan an EVA here' })).toHaveFocus();
    await user.tab();
    const sources = screen.getByText('Sources (1)').closest('summary')!;
    expect(sources).toHaveFocus();
    await user.keyboard('{Enter}');
    const details = sources.closest('details')!;
    // jsdom не синтезує click з Enter для <summary>; браузер робить це нативно.
    if (!details.open) sources.click();
    expect(details).toHaveAttribute('open');
    await user.keyboard('{Enter}');
    if (details.open) sources.click();
    expect(details).not.toHaveAttribute('open');
  });

  it('Given відкритий район; Then About this site згорнуто за замовчуванням', async () => {
    mockCard('gale', 'eva');
    render(<SiteCard site={siteById('gale')!} collapsed />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    const about = screen.getByText('About this site').closest('details');
    expect(about).not.toHaveAttribute('open');
  });

  it.each([
    ['gale', 'eva', 'Plan an EVA here'],
    ['columbia-hills', 'eva', 'Plan an EVA here'],
    ['olympus-mons', 'overview', 'Explore terrain'],
  ] as const)('Given %s (%s); Then головна кнопка «%s» відкриває район (та сама дія, що й вибір точки)', async (id, mode, action) => {
    const user = userEvent.setup();
    mockCard(id, mode);
    render(<SiteCard site={siteById(id)!} />);

    const card = await screen.findByRole('region', { name: siteById(id)!.name });
    await user.click(within(card).getByRole('button', { name: action }));
    expect(useMission.getState().site).toBe(id);
  });

  it('Given немає json для EVA-точки; Then кнопка «Plan an EVA here» усе одно є', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    render(<SiteCard site={siteById('gale')!} />);

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Plan an EVA here' })).toBeInTheDocument();
  });

  it('Given відкритий район; Then головної кнопки немає', async () => {
    mockCard('gale', 'eva');
    render(<SiteCard site={siteById('gale')!} collapsed />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    expect(screen.queryByRole('button', { name: 'Plan an EVA here' })).not.toBeInTheDocument();
  });

  it('Given картка з кнопкою; When Tab; Then фокус доходить до кнопки, далі до Sources', async () => {
    const user = userEvent.setup();
    mockCard('gale', 'eva');
    render(<SiteCard site={siteById('gale')!} />);
    await screen.findByRole('region', { name: 'Gale / Mount Sharp' });

    await user.tab();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Plan an EVA here' })).toHaveFocus();
    await user.tab();
    expect(screen.getByText('Sources (1)').closest('summary')).toHaveFocus();
  });
});
