// 2D-план Б (SPEC §7.5): та сама сітка, blocked/NoData, ореол, шари, цілі, маршрут, підсвічений відрізок.
import { useMemo, type MouseEvent } from 'react';
import type { Annotation, PlanningGrid, RoutePlan, Target, XY } from '../../contracts';
import { xyToCell } from '../../contracts/planning';
import { EvaSignShape, StatusNote } from '../../ui';
import { planToXY } from './lib/marks';
import { canPlaceMark } from './lib/markCursor';
import { MarkShape } from './MarkGlyph';
import { CELL } from './lib/cells';
import { CSS, HALO, HALO_FILL_ALPHA, haloCells } from './lib/overlay';
import { cellsPath, planPoint, polyline, selectedSegmentLine, type PlanReason } from './lib/plan2d';
import { segmentMarker } from './lib/segment';

export interface Plan2DProps {
  reason: PlanReason;
  grid: PlanningGrid;
  classes: Uint8Array;
  counts: { blocked: number; noData: number };
  /** RGBA північ-вгору (колір за висотою) — для фонового растра; null — без растра */
  rasterRGBA: Uint8Array | null;
  mask: Uint8Array | null;
  layerUrls: { id: string; url: string }[];
  /** Шари з сітки (slope, terrain): RGBA північ-вгору */
  gridLayers: { id: string; rgba: Uint8Array }[];
  /** Траверс марсохода, локальні метри (T12) */
  traverse: XY[][];
  /** F2-AC6: серії відрізків без повернення */
  noReturn: XY[][];
  targets: Target[];
  selectedIds: string[];
  plan: RoutePlan | null;
  selectedSegment: number | null;
  base: XY | null;
  /** Позиція астронавта; показується, якщо відрізняється від бази */
  position?: XY | null;
  /** Початок першого відрізка без повернення (точка неповернення, §7.8) */
  ponr?: XY | null;
  /** Мітки екіпажу (§7.12) */
  marks?: Annotation[];
  /** Режим «Add mark»: клік по плану → локальні метри */
  onPick?: ((xy: XY) => void) | null;
  /** Add mark: курсор над сіткою (true) чи поза нею (false) — для pin / not-allowed (#134) */
  onPickHover?: (valid: boolean) => void;
  /** Навігація без GPS: маяки, відрізки на інерціалці, контрольні точки */
  nav?: { beacons: { xy: XY; label: string }[]; drift: XY[][]; checkpoints: XY[] } | null;
}

function canDraw2D(): boolean {
  if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) return false;
  return typeof document !== 'undefined';
}

function rasterUrl(width: number, height: number, rgba: Uint8Array | null): string | null {
  if (!rgba || !canDraw2D()) return null;
  try {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), width, height), 0, 0);
    return c.toDataURL();
  } catch {
    return null;
  }
}

export function Plan2D({ reason, grid, classes, counts, rasterRGBA, mask, layerUrls, gridLayers, traverse, noReturn, targets, selectedIds, plan, selectedSegment, base, position = null, ponr = null, marks = [], onPick = null, onPickHover, nav = null }: Plan2DProps) {
  const { width: w, height: h } = grid;
  const blockedD = useMemo(() => cellsPath(w, classes, (c) => c === CELL.blocked), [w, classes]);
  const noDataD = useMemo(() => cellsPath(w, classes, (c) => c === CELL.noData), [w, classes]);
  // Та сама логіка, що й у 3D: ореол лише на прохідних, край — непрозорий контур.
  const [haloFillD, haloEdgeD] = useMemo(() => {
    const halo = haloCells(w, classes, mask);
    if (!halo) return ['', ''];
    return [cellsPath(w, halo, (c) => c === HALO.fill), cellsPath(w, halo, (c) => c === HALO.edge)];
  }, [w, classes, mask]);
  const raster = useMemo(() => rasterUrl(w, h, rasterRGBA), [w, h, rasterRGBA]);
  const gridLayerImgs = useMemo(() => gridLayers.map((l) => ({ id: l.id, href: rasterUrl(w, h, l.rgba) })), [w, h, gridLayers]);
  const seg = selectedSegmentLine(grid, plan, selectedSegment);
  const unit = Math.max(w, h) / 64;
  const routeStr = plan && plan.path.length >= 2 ? polyline(grid, plan.path) : '';
  const basePt = base ? planPoint(grid, base) : null;
  const marker = segmentMarker(plan, selectedSegment);
  const markerPt = marker ? planPoint(grid, marker.mid) : null;
  // Підпис над кільцем, по центру; половина оцінної ширини (~0.6 em на символ) — щоб не вийти за край.
  const markerHalfW = marker ? (marker.label.length * unit * 2.4 * 0.6) / 2 : 0;
  const inReach = (xy: XY) => {
    if (!mask) return true;
    const c = xyToCell(grid, xy);
    return c !== null && mask[c.index] === 1;
  };
  const posPt = position && base && (position[0] !== base[0] || position[1] !== base[1]) ? planPoint(grid, position) : null;
  const ponrPt = ponr ? planPoint(grid, ponr) : null;
  const sign = unit * 3.2;
  const onClick = onPick
    ? (e: MouseEvent<SVGSVGElement>) => {
        const svg = e.currentTarget;
        const m = svg.getScreenCTM();
        if (!m) return;
        const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
        onPick(planToXY(grid, pt.x, pt.y));
      }
    : undefined;
  const onMove =
    onPick && onPickHover
      ? (e: MouseEvent<SVGSVGElement>) => {
          const m = e.currentTarget.getScreenCTM();
          if (!m) return;
          const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
          onPickHover(canPlaceMark(grid, planToXY(grid, pt.x, pt.y)));
        }
      : undefined;
  const label = `2D plan B: ${targets.length} targets, ${plan ? plan.segments.length : 0} route segments, ${marks.length} crew marks, ${counts.blocked} blocked and ${counts.noData} NoData cells`;

  return (
    <div className="terrain-plan2d">
      {/* 2D обрали самі (кнопка «2D» або ?2d) — без пояснень; попередження лише коли 3D не вийшло. */}
      {reason.code === 'forced' ? null : (
        <StatusNote level="warn" live="status">
          3D unavailable: {reason.text}. Showing 2D plan.
        </StatusNote>
      )}
      <p className="terrain-counter">
        Blocked / NoData cells: {counts.blocked} / {counts.noData}
      </p>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} preserveAspectRatio="xMidYMid meet" className="terrain-svg" onClick={onClick} onMouseMove={onMove} onMouseLeave={onPick && onPickHover ? () => onPickHover(false) : undefined}>
        <title>{label}</title>
        <rect width={w} height={h} fill="#7a4a2c" />
        {raster && <image href={raster} width={w} height={h} preserveAspectRatio="none" style={{ imageRendering: 'pixelated' }} />}
        {layerUrls.map((l) => (
          <image key={l.id} data-layer={l.id} href={l.url} width={w} height={h} preserveAspectRatio="none" opacity={0.6} />
        ))}
        {gridLayerImgs.map(
          (l) =>
            l.href && <image key={l.id} data-layer={l.id} href={l.href} width={w} height={h} preserveAspectRatio="none" opacity={0.6} style={{ imageRendering: 'pixelated' }} />,
        )}
        {haloFillD && <path d={haloFillD} fill={CSS.halo} opacity={HALO_FILL_ALPHA / 255} data-kind="halo" />}
        {haloEdgeD && <path d={haloEdgeD} fill={CSS.halo} data-kind="halo-edge" />}
        {blockedD && <path d={blockedD} fill={CSS.blocked} data-kind="blocked" />}
        {noDataD && <path d={noDataD} fill={CSS.noData} data-kind="nodata" />}
        {traverse.map((l, k) => (
          <polyline
            key={k}
            points={polyline(grid, l)}
            fill="none"
            stroke={CSS.traverse}
            strokeWidth={unit * 0.5}
            strokeDasharray={`${unit * 1.5} ${unit}`}
            data-kind="traverse"
          />
        ))}
        {routeStr && <polyline points={routeStr} fill="none" stroke={CSS.route} strokeWidth={unit * 0.6} strokeLinejoin="round" data-kind="route" />}
        {noReturn.map((l, k) => (
          <polyline key={`nr${k}`} points={polyline(grid, l)} fill="none" stroke={CSS.noReturn} strokeWidth={unit * 0.9} strokeLinejoin="round" data-kind="no-return" />
        ))}
        {seg && (
          <line
            x1={seg[0][0]}
            y1={seg[0][1]}
            x2={seg[1][0]}
            y2={seg[1][1]}
            stroke={CSS.segment}
            strokeWidth={unit * 1.4}
            strokeLinecap="round"
            data-kind="selected-segment"
          />
        )}
        {basePt && (
          <g data-kind="base">
            <EvaSignShape kind="base" x={basePt[0]} y={basePt[1]} size={sign} />
            <text x={basePt[0] + unit * 2} y={basePt[1] + unit * 0.8} fontSize={unit * 2.4} fill="#f3ece6" stroke="#14100e" strokeWidth={unit * 0.3} paintOrder="stroke">
              Base
            </text>
          </g>
        )}
        {posPt && (
          <g data-kind="astronaut">
            <EvaSignShape kind="astronaut" x={posPt[0]} y={posPt[1]} size={sign} />
          </g>
        )}
        {targets.map((t) => {
          const [x, y] = planPoint(grid, t.coordinates);
          const sel = selectedIds.includes(t.id);
          const text = `${sel ? '✓ ' : ''}${t.name}`;
          // Не влазить праворуч (оцінка ширини ~0.6 em на символ) — підпис ліворуч від точки.
          const left = x + unit * 1.6 + text.length * unit * 2.4 * 0.6 > w;
          return (
            <g key={t.id} data-kind="target" data-selected={sel}>
              <EvaSignShape kind="target" state={!inReach(t.coordinates) ? 'outside' : sel ? 'selected' : 'unselected'} x={x} y={y} size={sign} label={`${t.name}${!inReach(t.coordinates) ? ', outside reachable area' : sel ? ', selected' : ''}`} />
              <text x={left ? x - unit * 1.6 : x + unit * 1.6} y={y + unit * 0.7} textAnchor={left ? 'end' : 'start'} fontSize={unit * 2.4} fill="#f3ece6" stroke="#14100e" strokeWidth={unit * 0.3} paintOrder="stroke" fontWeight={sel ? 700 : 400}>
                {text}
              </text>
            </g>
          );
        })}
        {nav?.drift.map((l, k) => (
          <polyline key={`drift-${k}`} points={polyline(grid, l)} fill="none" stroke={CSS.drift} strokeWidth={unit * 0.9} strokeDasharray={`${unit * 1.5} ${unit}`} strokeLinecap="round" data-kind="drift" />
        ))}
        {nav?.checkpoints.map((c, k) => {
          const [x, y] = planPoint(grid, c);
          return <rect key={`cp-${k}`} x={x - unit * 1.2} y={y - unit * 1.2} width={unit * 2.4} height={unit * 2.4} transform={`rotate(45 ${x} ${y})`} fill="none" stroke={CSS.checkpoint} strokeWidth={unit * 0.5} data-kind="checkpoint" />;
        })}
        {nav?.beacons.map((b) => {
          const [x, y] = planPoint(grid, b.xy);
          return (
            <g key={`beacon-${b.label}`} data-kind="beacon">
              <circle cx={x} cy={y} r={unit * 2.4} fill="none" stroke={CSS.beacon} strokeWidth={unit * 0.4} />
              <polygon points={`${x},${y - unit * 1.6} ${x + unit * 1.3},${y + unit} ${x - unit * 1.3},${y + unit}`} fill={CSS.beacon} />
              <text x={x + unit * 2.8} y={y + unit * 0.8} fontSize={unit * 2.2} fill={CSS.beacon} stroke="#050506" strokeWidth={unit * 0.3} paintOrder="stroke">
                {b.label}
              </text>
            </g>
          );
        })}
        {ponrPt && (
          <g data-kind="ponr">
            <EvaSignShape kind="ponr" x={ponrPt[0]} y={ponrPt[1]} size={sign * 1.1} />
          </g>
        )}
        {marks.map((m) => {
          const [x, y] = planPoint(grid, m.coordinates);
          return <MarkShape key={m.id} mark={m} x={x} y={y} rUnits={m.radiusM / grid.metersPerPixel} size={sign} />;
        })}
        {marker && markerPt && (
          // Поверх цілей: кільце навколо відрізка й підпис, бо сам відрізок — один крок сітки.
          <g data-kind="segment-marker">
            <circle cx={markerPt[0]} cy={markerPt[1]} r={unit * 2.6} fill="none" stroke={CSS.segment} strokeWidth={unit * 0.6} />
            <text
              x={Math.min(Math.max(markerPt[0], markerHalfW), w - markerHalfW)}
              y={markerPt[1] - unit * 3.4 < unit * 2.4 ? markerPt[1] + unit * 5.2 : markerPt[1] - unit * 3.4}
              textAnchor="middle"
              fontSize={unit * 2.4}
              fontWeight={700}
              fill={CSS.segment}
              stroke="#14100e"
              strokeWidth={unit * 0.35}
              paintOrder="stroke"
            >
              {marker.label}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
