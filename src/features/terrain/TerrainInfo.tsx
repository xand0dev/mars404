// Рядок фактів під рельєфом (F2-AC1): розмір сітки, м/клітинку, «height ×3», статус даних, легенда.
import type { Evidence } from '../../contracts';
import { VERTICAL_EXAGGERATION } from '../../contracts';
import { CSS } from './lib/overlay';

const EVIDENCE_LABEL: Record<Evidence, string> = { verified: 'verified', mock: 'MOCK', assumption: 'assumption', pending: 'pending' };

export interface TerrainInfoProps {
  width: number;
  height: number;
  metersPerPixel: number;
  status: Evidence;
  texture: string;
  counts: { blocked: number; noData: number };
  haloShown: boolean;
  routeShown: boolean;
  segmentShown: boolean;
  /** Траверс марсохода показано (T12) */
  traverse: { status: Evidence } | null;
  /** drawn: false — F2 не вміє намалювати цей шар (чесно в легенді) */
  layers: { name: string; status: Evidence; drawn: boolean }[];
  warnings: string[];
}

const Swatch = ({ color }: { color: string }) => <span className="terrain-swatch" style={{ background: color }} aria-hidden="true" />;

export function TerrainInfo({ width, height, metersPerPixel, status, texture, counts, haloShown, routeShown, segmentShown, traverse, layers, warnings }: TerrainInfoProps) {
  return (
    <div className="terrain-info">
      <p className="terrain-facts" aria-label="Terrain facts">
        <span>
          Grid {width}×{height}
        </span>
        <span>{metersPerPixel} m/cell</span>
        <span>height ×{VERTICAL_EXAGGERATION}</span>
        <span>
          Data: <strong>{EVIDENCE_LABEL[status]}</strong>
        </span>
        <span>Surface: {texture}</span>
      </p>
      <p className="terrain-legend">
        <span>
          <Swatch color={CSS.blocked} />✖ Blocked {counts.blocked}
        </span>
        <span>
          <Swatch color={CSS.noData} />? NoData {counts.noData}
        </span>
        {haloShown && (
          <span>
            <Swatch color={CSS.halo} />↺ Reach halo
          </span>
        )}
        {routeShown && (
          <span>
            <Swatch color={CSS.route} />— Route
          </span>
        )}
        {segmentShown && (
          <span>
            <Swatch color={CSS.segment} />━ Selected segment
          </span>
        )}
        {traverse && (
          <span>
            <Swatch color={CSS.traverse} />┅ Rover traverse ({EVIDENCE_LABEL[traverse.status]})
          </span>
        )}
        {layers.map((l) => (
          <span key={l.name}>
            ▦ {l.name} ({EVIDENCE_LABEL[l.status]}){l.drawn ? '' : ' · not drawn'}
          </span>
        ))}
      </p>
      {warnings.map((w) => (
        <p key={w} className="ui-note ui-note--warn">
          <span aria-hidden="true">⚠</span> <span>{w}</span>
        </p>
      ))}
    </div>
  );
}
