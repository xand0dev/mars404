import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import type { Layer, MissionState, PlanningGrid, Region } from '../../contracts';
import { mockGrid } from '../../mocks';
import { resetMission, useMission } from '../../store/useMission';
import { useCameraMode } from './cameraStore';
import { CameraModes } from './CameraModes';
import { MapView } from './MapView';
import { Plan2D } from './Plan2D';
import { planThrough, smallGrid, testRegion } from './lib/fixtures';

const gale = () => act(() => useMission.setState({ site: 'gale' }));
const terrain = () => screen.getByRole('region', { name: 'Gale terrain' });

beforeEach(() => {
  resetMission();
  useCameraMode.setState({ mode: 'orbit', view3D: true });
});

describe('MapView (jsdom без WebGL → 2D-план Б)', () => {
  it('site = null → глобус, без 2D-плану рельєфу', () => {
    render(<MapView globe={null} />);
    expect(screen.getByRole('region', { name: 'Mars globe' })).toBeInTheDocument();
    expect(screen.queryByText(/Blocked \/ NoData cells/)).toBeNull();
  });

  it('F2-AC1: розмір сітки, м/клітинку, «height ×3», статус MOCK', () => {
    render(<MapView globe={null} />);
    gale();
    const facts = within(terrain()).getByLabelText('Terrain facts');
    expect(facts).toHaveTextContent('Grid 128×128');
    expect(facts).toHaveTextContent('10 m/cell');
    expect(facts).toHaveTextContent('height ×3');
    expect(facts).toHaveTextContent('Data: MOCK');
  });

  it('F2-AC2/AC4: без WebGL видно причину, лічильник blocked/NoData, цілі', () => {
    render(<MapView globe={null} />);
    gale();
    expect(screen.getByText(/WebGL unavailable/)).toBeInTheDocument();
    expect(screen.getByText('Blocked / NoData cells: 101 / 2')).toBeInTheDocument();
    const svg = screen.getByRole('img', { name: /2D plan/ });
    expect(svg.querySelectorAll('[data-kind="target"]')).toHaveLength(5);
    expect(svg.querySelector('[data-kind="blocked"]')).not.toBeNull();
    expect(svg.querySelector('[data-kind="nodata"]')).not.toBeNull();
  });

  it('F2-AC3: маршрут і підсвітка selectedSegment; null — без підсвітки', () => {
    render(<MapView globe={null} />);
    gale();
    const plan = planThrough(mockGrid, [[64, 64], [63, 64], [62, 65]]);
    act(() => useMission.setState({ plan, selectedSegment: 1 }));
    const svg = screen.getByRole('img', { name: /2D plan/ });
    expect(svg.querySelector('[data-kind="route"]')).not.toBeNull();
    expect(svg.querySelector('[data-kind="selected-segment"]')).not.toBeNull();
    // Відрізок — один крок сітки (~10 м), тож поруч помітний маркер з підписом.
    expect(svg.querySelector('[data-kind="segment-marker"]')).toHaveTextContent('Segment 2 · leg 1');
    act(() => useMission.setState({ selectedSegment: null }));
    expect(svg.querySelector('[data-kind="selected-segment"]')).toBeNull();
    expect(svg.querySelector('[data-kind="segment-marker"]')).toBeNull();
  });

  it('ореол reach.mask у 2D', () => {
    render(<MapView globe={null} />);
    gale();
    act(() =>
      useMission.setState({
        reach: { status: 'estimated', mask: new Uint8Array(128 * 128).fill(1), returnInS: 600, deficits: [], swap: null, abort: null, warnings: [] },
      }),
    );
    expect(screen.getByRole('img', { name: /2D plan/ }).querySelector('[data-kind="halo"]')).not.toBeNull();
  });

  it('F2-AC4: невалідна сітка → причина «Invalid grid»', () => {
    render(<MapView globe={null} />);
    const bad: PlanningGrid = { ...mockGrid, elevationsM: new Float32Array(10) };
    act(() => useMission.setState({ site: 'gale', grid: bad }));
    expect(screen.getByText(/Invalid grid: elevationsM/)).toBeInTheDocument();
  });

  it('F2-AC1/AC2: після setRegionData той самий код бере реальну сітку, region.noData і статус', () => {
    render(<MapView globe={null} />);
    const grid = smallGrid();
    act(() => useMission.getState().setRegionData({ region: testRegion(grid, 'verified'), grid, targets: [] }));
    gale();
    const facts = within(terrain()).getByLabelText('Terrain facts');
    expect(facts).toHaveTextContent('Grid 4×3');
    expect(facts).toHaveTextContent('Data: verified');
    expect(screen.getByText('Blocked / NoData cells: 2 / 3')).toBeInTheDocument();
    expect(terrain().querySelector('.ui-badge--mock')).toBeNull();
  });
});

describe('CameraModes', () => {
  it('вимкнені на глобусі; на Gale перемикаються з aria-pressed', async () => {
    const user = userEvent.setup();
    render(<CameraModes />);
    expect(screen.getByRole('button', { name: 'Top' })).toBeDisabled();
    gale();
    await user.click(screen.getByRole('button', { name: 'Top' }));
    expect(screen.getByRole('button', { name: 'Top' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Orbit' })).toHaveAttribute('aria-pressed', 'false');
    await user.click(screen.getByRole('button', { name: 'POV' }));
    expect(screen.getByText(/Eye height 1.7 m — assumption/)).toBeInTheDocument();
  });
});

describe('CameraModes у 2D-плані', () => {
  it('без 3D кнопки камер вимкнені з поясненням', () => {
    render(
      <>
        <MapView globe={null} />
        <CameraModes />
      </>,
    );
    gale();
    expect(screen.getByRole('button', { name: 'Top' })).toBeDisabled();
    expect(screen.getByText('Camera modes need 3D')).toBeInTheDocument();
  });
});

describe('F2-AC3: F2 нічого не пише в store', () => {
  it('рендер 3D/2D, зміна плану і камер не викликають жодної дії store', async () => {
    const user = userEvent.setup();
    const names = [
      'setSite', 'toggleLayer', 'setRegionData', 'toggleTarget', 'replaceTarget', 'setWaypoints', 'setPlan',
      'setSelectedSegment', 'setBudget', 'setReach', 'setLimits', 'setTime', 'setPosition',
    ] as const satisfies readonly (keyof MissionState)[];
    const spies = Object.fromEntries(names.map((n) => [n, vi.fn()]));
    // resetMission() відновлює лише дані, тож справжні дії повертаємо самі.
    const original = Object.fromEntries(names.map((n) => [n, useMission.getState()[n]]));
    onTestFinished(() => useMission.setState(original));
    useMission.setState({ ...spies, site: 'gale', selectedTargetIds: ['mock-a'] });
    render(
      <>
        <MapView globe={null} />
        <CameraModes />
      </>,
    );
    act(() => useMission.setState({ plan: planThrough(mockGrid, [[64, 64], [63, 64]]), selectedSegment: 0 }));
    // jsdom показує 2D; вмикаємо кнопки, щоб перевірити й перемикання камер.
    act(() => useCameraMode.setState({ view3D: true }));
    for (const b of ['Top', 'POV', 'Orbit']) await user.click(screen.getByRole('button', { name: b }));
    expect(useCameraMode.getState().mode).toBe('orbit');
    for (const n of names) expect(spies[n], n).not.toHaveBeenCalled();
  });
});

describe('T12: траверс марсохода (region.files.traverse)', () => {
  const geojson = {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: [[137.405, -4.735, -4400], [137.41, -4.74, -4410], [137.5, -4.74, 0]] }, properties: {} }],
  };
  const traverseLayer: Layer = {
    id: 'traverse', name: 'Rover traverse', kind: 'mission', url: 'traverse.geojson', sourceIds: [], status: 'verified',
    units: '', nativeResolutionM: null, gridResolutionM: 10, method: 'MMGIS export', legend: [],
  };
  const withTraverse = (layers: Layer[] = []): Region => ({
    ...testRegion(mockGrid, 'verified'),
    files: { ...testRegion(mockGrid).files, traverse: 'traverse.geojson' },
    layers,
  });
  const open = (region: Region, flags: Record<string, boolean> = {}) => {
    render(<MapView globe={null} />);
    act(() => {
      useMission.getState().setRegionData({ region, grid: mockGrid, targets: [] });
      useMission.setState({ site: 'gale', layers: flags });
    });
  };
  const svg = () => screen.getByRole('img', { name: /2D plan/ });

  afterEach(() => vi.unstubAllGlobals());

  it('Given файл траверсу; Then лінія в 2D, підпис у легенді й попередження про точку поза сіткою', async () => {
    const fetchMock = vi.fn(async (url: string) => new Response(url && JSON.stringify(geojson)));
    vi.stubGlobal('fetch', fetchMock);
    open(withTraverse());
    await waitFor(() => expect(svg().querySelector('[data-kind="traverse"]')).not.toBeNull());
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/data\/gale\/traverse\.geojson$/);
    expect(within(terrain()).getByText(/Rover traverse/)).toBeInTheDocument();
    expect(screen.getByText(/Traverse: 1 point\(s\) outside the grid skipped/)).toBeInTheDocument();
  });

  it('Given шар traverse вимкнено в F3; Then лінії немає і файл не вантажиться', () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(geojson)));
    vi.stubGlobal('fetch', fetchMock);
    open(withTraverse([traverseLayer]), { traverse: false });
    expect(svg().querySelector('[data-kind="traverse"]')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Given шар traverse увімкнено; Then лінія є, а geojson не вантажиться як растр', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(geojson))));
    open(withTraverse([traverseLayer]), { traverse: true });
    await waitFor(() => expect(svg().querySelector('[data-kind="traverse"]')).not.toBeNull());
    expect(svg().querySelector('[data-layer="traverse"]')).toBeNull();
  });

  it('Given файл не завантажився; Then чесне попередження, без лінії', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 404 })));
    open(withTraverse());
    expect(await screen.findByText(/Traverse failed to load \(HTTP 404\)/)).toBeInTheDocument();
    expect(svg().querySelector('[data-kind="traverse"]')).toBeNull();
  });
});

describe('План Б: ?2d — підпис без «3D unavailable»', () => {
  it('Plan2D з причиною forced пише, що 2D обрано свідомо', () => {
    const grid = smallGrid();
    render(
      <Plan2D
        reason={{ code: 'forced', text: '2D plan requested with ?2d' }}
        grid={grid}
        classes={new Uint8Array(grid.width * grid.height)}
        counts={{ blocked: 0, noData: 0 }}
        rasterRGBA={null}
        mask={null}
        layerUrls={[]}
        gridLayers={[]}
        traverse={[]}
        targets={[]}
        selectedIds={[]}
        plan={null}
        selectedSegment={null}
        base={null}
      />,
    );
    expect(screen.getByText(/2D plan requested with \?2d/)).toBeInTheDocument();
    expect(screen.queryByText(/3D unavailable/)).toBeNull();
  });
});

describe('Шари F3: slope з сітки, чесна легенда', () => {
  it('slope (.f32 з легендою) малюється з сітки; шар, який F2 не вміє, позначено «not drawn»', () => {
    const mk = (id: string, kind: Layer['kind'], url: string, legend: Layer['legend']): Layer => ({
      id, name: id === 'slope' ? 'Slope (derived)' : 'Thermal', kind, url, sourceIds: [], status: 'assumption',
      units: '', nativeResolutionM: null, gridResolutionM: 10, method: 'test', legend,
    });
    const region: Region = {
      ...testRegion(mockGrid, 'verified'),
      layers: [mk('slope', 'slope', 'slope.f32', [{ value: 0, label: '0', color: '#2f6f4f' }, { value: 25, label: '25', color: '#c0392b' }]), mk('thermal', 'thermal', 'themis.f32', [])],
    };
    render(<MapView globe={null} />);
    act(() => {
      useMission.getState().setRegionData({ region, grid: mockGrid, targets: [] });
      useMission.setState({ site: 'gale', layers: { slope: true, thermal: true } });
    });
    const legend = within(terrain()).getByText(/Slope \(derived\)/).closest('p') as HTMLElement;
    expect(legend).toHaveTextContent(/Slope \(derived\) \(assumption\)(?! · not drawn)/);
    expect(legend).toHaveTextContent('Thermal (assumption) · not drawn');
  });
});
