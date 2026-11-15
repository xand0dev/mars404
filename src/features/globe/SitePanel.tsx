// F1: вибір місця. EVA (Gale, Columbia Hills) і Overview (Olympus Mons, Valles Marineris) — переліт і setSite;
// Jezero / Meridiani — лише картка; «coming soon» — кнопка вимкнена (#105).
import { useEffect } from 'react';
import { useMission } from '../../store/useMission';
import { Panel, StatusNote } from '../../ui';
import { SiteCard } from './SiteCardView';
import { useGlobe } from './globeState';
import { chooseSite, openSite } from './choose';
import { FLY_MS } from './motion';
import { MODE_GLYPH, SITES, canOpenSite, modeLabel, siteById } from './sites';
import { ZOOM_MIN, useZoom } from './zoom';

const listStyle = { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 8 } as const;

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
  const opened = site === null ? undefined : siteById(site);

  return (
    <Panel title="Location" featureId="F1" owner="Іван" mock={texture.status !== 'ok'}>
      <ul style={listStyle}>
        {SITES.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              data-site={s.id}
              data-mode={s.comingSoon ? 'soon' : s.mode}
              aria-pressed={canOpenSite(s) ? site === s.id : previewId === s.id}
              aria-describedby={`f1-mode-${s.id}`}
              disabled={s.comingSoon}
              onClick={() => chooseSite(s.id)}
            >
              <span aria-hidden="true">{MODE_GLYPH[s.comingSoon ? 'soon' : s.mode]} </span>
              {s.name}
            </button>
            <span id={`f1-mode-${s.id}`} hidden>
              {modeLabel(s)}
            </span>
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
      {previewed ? <SiteCard site={previewed} /> : opened && <SiteCard site={opened} collapsed />}
      <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        {texture.status === 'ok'
          ? `Texture: ${texture.credit}`
          : 'Texture not loaded — procedural sphere (MOCK).'}
      </p>
    </Panel>
  );
}
