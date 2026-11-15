// F3: панель шарів — перемикачі (toggleLayer), легенда текстом, одиниці, походження, помилки шарів (F3-AC3, AC4).
import { SITE_LABEL, type Layer, type Region, type Source } from '../../contracts';
import { useMission } from '../../store/useMission';
import { Panel, StatusNote } from '../../ui';
import { useDataStatus } from './dataStatus';
import type { LayerIssue } from './loadRegion';
import './data.css';

function provenance(layer: Layer, region: Region): string {
  const srcs = layer.sourceIds.map((id) => region.sources.find((s) => s.id === id)).filter((s): s is Source => !!s);
  const ids = srcs.map((s) => s.productId ?? s.url ?? s.title).join(', ');
  const credits = [...new Set(srcs.map((s) => s.credit).filter(Boolean))].join('; ');
  const native = layer.nativeResolutionM === null ? 'native n/a' : `native ${layer.nativeResolutionM} m`;
  return [ids, `${native} → grid ${layer.gridResolutionM} m`, layer.method, credits && `© ${credits}`].filter(Boolean).join(' · ');
}

function LayerItem({ layer, region, on, issues, toggle }: { layer: Layer; region: Region; on: boolean; issues: LayerIssue[]; toggle: () => void }) {
  const broken = issues.length > 0;
  const srcUrl = layer.sourceIds.map((id) => region.sources.find((s) => s.id === id)?.url).find(Boolean);
  return (
    <li className="data-layer" data-testid={`layer-${layer.id}`}>
      <div className="data-layer__head">
        <button type="button" className="data-toggle" aria-pressed={on && !broken} disabled={broken} onClick={toggle}>
          <span aria-hidden="true">{on && !broken ? '◉' : '○'}</span> {layer.name}
        </button>
        <span className={`ui-badge data-status data-status--${layer.status}`}>{layer.status}</span>
      </div>
      {issues.map((i) => (
        <StatusNote key={i.file} level="danger">
          Layer failed: {i.file}: {i.message}
        </StatusNote>
      ))}
      <ul className="data-legend" aria-label={`${layer.name} legend`}>
        {layer.legend.map((s) => (
          <li key={`${s.value}-${s.label}`}>
            <span className="data-swatch" style={{ background: s.color }} aria-hidden="true" />
            {s.label}
          </li>
        ))}
      </ul>
      <p className="data-meta">Units: {layer.units}</p>
      <p className="data-meta" data-testid="provenance">
        Source: {provenance(layer, region)}
        {srcUrl && (
          <>
            {' '}
            · <a href={srcUrl} target="_blank" rel="noreferrer">link</a>
          </>
        )}
      </p>
    </li>
  );
}

export function LayersPanel() {
  const site = useMission((s) => s.site);
  const region = useMission((s) => s.region);
  const grid = useMission((s) => s.grid);
  const flags = useMission((s) => s.layers);
  const toggleLayer = useMission((s) => s.toggleLayer);
  const { phase, reason, issues, warnings } = useDataStatus();
  const real = phase === 'real' && region !== null;
  const layerIds = new Set(region?.layers.map((l) => l.id) ?? []);
  const otherIssues = issues.filter((i) => !layerIds.has(i.id) || !real);

  return (
    <Panel title="Layers" featureId="F3" owner="Максим" mock={!real}>
      {site === null && <StatusNote level="info">Open a site on the globe to load real NASA layers.</StatusNote>}
      {site !== null && phase === 'loading' && <StatusNote level="pending">Loading {SITE_LABEL[site]} data package…</StatusNote>}
      {phase === 'mock' && (
        <StatusNote level="warn" live="status">
          Mock terrain: {reason}
        </StatusNote>
      )}
      {real && (
        <StatusNote level={region.status === 'verified' ? 'ok' : 'warn'}>
          Real grid {grid.width}×{grid.height} · {grid.metersPerPixel} m/cell · {region.status}
        </StatusNote>
      )}
      {otherIssues.map((i) => (
        <StatusNote key={`${i.id}-${i.file}`} level="danger">
          {i.id}: {i.file}: {i.message}
        </StatusNote>
      ))}
      {real && (
        <ul className="data-layers">
          {region.layers.map((l) => (
            <LayerItem key={l.id} layer={l} region={region} on={flags[l.id] === true} issues={issues.filter((i) => i.id === l.id)} toggle={() => toggleLayer(l.id)} />
          ))}
        </ul>
      )}
      {real && warnings.length > 0 && (
        <details className="data-warnings">
          <summary>{warnings.length} data warning(s)</summary>
          <ul>
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </details>
      )}
    </Panel>
  );
}
