// 2D-план Б (SPEC §7.5): та сама сітка, blocked/NoData, ореол, шари, цілі, маршрут, підсвічений відрізок.
import { useMemo } from 'react';
import type { PlanningGrid, RoutePlan, Target, XY } from '../../contracts';
import { StatusNote } from '../../ui';
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
  /** Траверс марсохода, локальні метри (T12) */
  traverse: XY[][];
  targets: Target[];
  selectedIds: string[];
  plan: RoutePlan | null;
  selectedSegment: number | null;
  base: XY | null;
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

export function Plan2D({ reason, grid, classes, counts, rasterRGBA, mask, layerUrls, traverse, targets, selectedIds, plan, selectedSegment, base }: Plan2DProps) {
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
  const seg = selectedSegmentLine(grid, plan, selectedSegment);
  const unit = Math.max(w, h) / 64;
  const routeStr = plan && plan.path.length >= 2 ? polyline(grid, plan.path) : '';
  const basePt = base ? planPoint(grid, base) : null;
  const marker = segmentMarker(plan, selectedSegment);
  const markerPt = marker ? planPoint(grid, marker.mid) : null;
  // Підпис над кільцем, по центру; половина оцінної ширини (~0.6 em на символ) — щоб не вийти за край.
  const markerHalfW = marker ? (marker.label.length * unit * 2.4 * 0.6) / 2 : 0;
  const label = `2D plan B: ${targets.length} targets, ${plan ? plan.segments.length : 0} route segments, ${counts.blocked} blocked and ${counts.noData} NoData cells`;

  return (
    <div className="terrain-plan2d">
      {reason.code === 'forced' ? (
        <StatusNote level="info" live="status">
          {reason.text}. Remove ?2d from the address for 3D.
        </StatusNote>
      ) : (
        <StatusNote level="warn" live="status">
          3D unavailable: {reason.text}. Showing 2D plan.
        </StatusNote>
      )}
      <p className="terrain-counter">
        Blocked / NoData cells: {counts.blocked} / {counts.noData}
      </p>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} preserveAspectRatio="xMidYMid meet" className="terrain-svg">
        <title>{label}</title>
        <rect width={w} height={h} fill="#7a4a2c" />
        {raster && <image href={raster} width={w} height={h} preserveAspectRatio="none" style={{ imageRendering: 'pixelated' }} />}
        {layerUrls.map((l) => (
          <image key={l.id} data-layer={l.id} href={l.url} width={w} height={h} preserveAspectRatio="none" opacity={0.6} />
        ))}
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
            <rect x={basePt[0] - unit} y={basePt[1] - unit} width={unit * 2} height={unit * 2} fill="#6cc28a" />
            <text x={basePt[0] + unit * 1.5} y={basePt[1] + unit * 0.6} fontSize={unit * 2.4} fill="#f3ece6" stroke="#14100e" strokeWidth={unit * 0.3} paintOrder="stroke">
              Base
            </text>
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
              <circle cx={x} cy={y} r={unit * (sel ? 1.4 : 1)} fill={sel ? '#e0673c' : '#f3ece6'} stroke="#14100e" strokeWidth={unit * 0.25} />
              <text x={left ? x - unit * 1.6 : x + unit * 1.6} y={y + unit * 0.7} textAnchor={left ? 'end' : 'start'} fontSize={unit * 2.4} fill="#f3ece6" stroke="#14100e" strokeWidth={unit * 0.3} paintOrder="stroke" fontWeight={sel ? 700 : 400}>
                {text}
              </text>
            </g>
          );
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
