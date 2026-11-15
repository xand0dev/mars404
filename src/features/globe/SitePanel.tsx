// F1: вибір місця. Gale відкриває район (setSite), інші точки — картка «next site» без зміни site.
import { useEffect } from 'react';
import { useMission } from '../../store/useMission';
import { Panel, StatusNote } from '../../ui';
import { useGlobe } from './globeState';
import { chooseSite, openSite } from './choose';
import { FLY_MS } from './motion';
import { SITES, siteById, type Site } from './sites';
import { ZOOM_MIN, useZoom } from './zoom';

const listStyle = { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 8 } as const;

function formatLatLon({ latDeg, lonEastDeg }: Site): string {
  return `${Math.abs(latDeg).toFixed(2)}° ${latDeg < 0 ? 'S' : 'N'}, ${lonEastDeg.toFixed(2)}° E`;
}


/** #80: кнопки масштабу — для клавіатури й тих, хто без тачпада. */
function ZoomControls() {
  const zoom = useZoom((s) => s.zoom);
  const maxZoom = useZoom((s) => s.maxZoom);
  const { zoomIn, zoomOut, reset } = useZoom.getState();
  return (
    <div role="group" aria-label="Globe zoom" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <button type="button" onClick={zoomOut} disabled={zoom <= ZOOM_MIN + 1e-9} aria-label="Zoom out">
        −
      </button>
      <button type="button" onClick={zoomIn} disabled={zoom >= maxZoom - 1e-9} aria-label="Zoom in">
        +
      </button>
      <button type="button" onClick={reset}>
        Reset view
      </button>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }} aria-live="polite">
        {zoom.toFixed(1)}×
      </span>
    </div>
  );
}

function SiteCard({ site }: { site: Site }) {
  const headingId = `f1-site-${site.id}`;
  return (
    <section aria-labelledby={headingId} style={{ marginTop: 8 }}>
      <h3 id={headingId} style={{ fontSize: '0.95rem', margin: '0 0 4px' }}>
        {site.name}
      </h3>
      <p style={{ margin: '0 0 4px' }}>{site.summary}</p>
      <StatusNote level="info" live="status">
        next site — not modelled
      </StatusNote>
      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        {formatLatLon(site)} ·{' '}
        <a href={site.source.url} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>
          IAU Gazetteer
        </a>
      </p>
    </section>
  );
}

export function SitePanel() {
  const site = useMission((s) => s.site);
  const setSite = useMission((s) => s.setSite);
  const previewId = useGlobe((s) => s.previewId);
  const resetUi = useGlobe((s) => s.resetUi);
  const texture = useGlobe((s) => s.texture);
  const flying = useGlobe((s) => s.flying);
  const flyTo = useGlobe((s) => s.flyTo);
  const sceneReady = useGlobe((s) => s.sceneReady);

  // F1-AC3: один таймер на перехід; пише в store рівно раз — у кінці. Skip / скасування прибирають його.
  useEffect(() => {
    if (!flying) return;
    const id = setTimeout(() => openSite(), FLY_MS);
    return () => clearTimeout(id);
  }, [flying]);

  const back = () => {
    resetUi();
    setSite(null);
  };
  const previewed = previewId === null ? undefined : siteById(previewId);

  return (
    <Panel title="Location" featureId="F1" owner="Іван" mock={texture.status !== 'ok'}>
      <ul style={listStyle}>
        {SITES.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              data-site={s.id}
              aria-pressed={s.modelled ? site === s.id : previewId === s.id}
              onClick={() => chooseSite(s.id)}
            >
              {s.name}
            </button>
          </li>
        ))}
      </ul>
      {site === null && sceneReady && <ZoomControls />}
      {flying && (
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <StatusNote level="info" live="status">
            Flying to {siteById(flyTo)?.name ?? 'site'}…
          </StatusNote>
          <button type="button" onClick={() => openSite()}>
            Skip
          </button>
        </div>
      )}
      {site !== null && (
        <p style={{ margin: '8px 0 0' }}>
          <button type="button" onClick={back}>
            Back to globe
          </button>
        </p>
      )}
      {previewed && <SiteCard site={previewed} />}
      <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        {texture.status === 'ok'
          ? `Texture: ${texture.credit}`
          : 'Texture not loaded — procedural sphere (MOCK).'}
      </p>
    </Panel>
  );
}
