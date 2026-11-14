// F1: вибір місця. Gale відкриває район (setSite), інші точки — картка «next site» без зміни site.
import { useCallback, useEffect } from 'react';
import { useMission } from '../../store/useMission';
import { Panel, StatusNote } from '../../ui';
import { useGlobe } from './globeState';
import { FLY_MS, prefersReducedMotion } from './motion';
import { GALE_ID, SITES, siteById, type Site } from './sites';

const listStyle = { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 8 } as const;

function formatLatLon({ latDeg, lonEastDeg }: Site): string {
  return `${Math.abs(latDeg).toFixed(2)}° ${latDeg < 0 ? 'S' : 'N'}, ${lonEastDeg.toFixed(2)}° E`;
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
  const preview = useGlobe((s) => s.preview);
  const resetUi = useGlobe((s) => s.resetUi);
  const texture = useGlobe((s) => s.texture);
  const flying = useGlobe((s) => s.flying);
  const setFlying = useGlobe((s) => s.setFlying);
  const sceneReady = useGlobe((s) => s.sceneReady);

  const openGale = useCallback(() => {
    setFlying(false);
    setSite(GALE_ID);
  }, [setFlying, setSite]);

  // F1-AC3: один таймер на перехід; пише в store рівно раз — у кінці. Skip / скасування прибирають його.
  useEffect(() => {
    if (!flying) return;
    const id = setTimeout(openGale, FLY_MS);
    return () => clearTimeout(id);
  }, [flying, openGale]);

  const choose = (s: Site) => {
    if (s.id === GALE_ID) {
      preview(null);
      if (flying || !sceneReady || prefersReducedMotion()) openGale();
      else setFlying(true);
    } else {
      setFlying(false);
      preview(s.id);
    }
  };
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
              aria-pressed={s.id === GALE_ID ? site === GALE_ID : previewId === s.id}
              onClick={() => choose(s)}
            >
              {s.name}
            </button>
          </li>
        ))}
      </ul>
      {flying && (
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <StatusNote level="info" live="status">
            Flying to Gale…
          </StatusNote>
          <button type="button" onClick={openGale}>
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
