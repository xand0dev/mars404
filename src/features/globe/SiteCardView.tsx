import { useEffect, useState, type ReactNode } from 'react';
import { dataUrl } from '../../contracts/planning';
import { Disclosure, EvidenceBadge, ItemRow } from '../../ui';
import { chooseSite } from './choose';
import { loadSiteCard, type SiteCardData } from './siteCard';
import { MODE_GLYPH, canOpenSite, modeLabel, type Site } from './sites';
import './siteCard.css';

export interface SiteCardProps {
  site: Site;
  /** Відкритий район: деталі не займають панель, доки користувач їх не попросить. */
  collapsed?: boolean;
}

const ACTION_LABEL = { eva: 'Plan an EVA here', overview: 'Explore terrain' } as const;

function formatLatLon({ latDeg, lonEastDeg }: Site): string {
  return `${Math.abs(latDeg).toFixed(2)}° ${latDeg < 0 ? 'S' : 'N'}, ${lonEastDeg.toFixed(2)}° E`;
}

function CardBody({ site, data, region = true }: { site: Site; data: SiteCardData | null | undefined; region?: boolean }) {
  const headingId = `f1-site-${site.id}`;
  const title = data?.title ?? site.name;
  const sources = new Map(data?.sources.map((source) => [source.id, source]));

  const content = (
    <>
      {data?.image && (
        <figure className="site-card__figure">
          <img src={dataUrl(`sites/${data.image.file}`)} alt={data.image.alt} loading="lazy" />
          <figcaption>
            <a href={data.image.sourceUrl} target="_blank" rel="noreferrer">
              {data.image.credit}
            </a>{' '}
            <EvidenceBadge status={data.image.status} />
          </figcaption>
        </figure>
      )}

      <header className="site-card__header">
        <h3 id={headingId}>{title}</h3>
        {data?.subtitle && <p className="site-card__subtitle">{data.subtitle}</p>}
        {region && (
          <span className={`site-card__mode site-card__mode--${site.mode}`}>
            <span aria-hidden="true">{MODE_GLYPH[site.mode]}</span> {modeLabel(site)}
          </span>
        )}
      </header>

      <p className="site-card__summary">{data?.summary ?? site.summary}</p>
      {data?.whyGo && (
        <p className="site-card__why">
          <strong>Why go:</strong> {data.whyGo}
        </p>
      )}

      {data && data.facts.length > 0 && (
        <ul className="ui-list site-card__facts" aria-label="Site facts">
          {data.facts.map((fact) => {
            const source = sources.get(fact.sourceId);
            return <ItemRow key={`${fact.label}-${fact.sourceId}`} title={`${fact.label} — ${fact.value}`} meta={source && <EvidenceBadge status={source.status} />} />;
          })}
        </ul>
      )}

      {site.mode === 'card' && <p className="site-card__unmodelled">Terrain not modelled yet</p>}
      {region && site.mode !== 'card' && canOpenSite(site) && (
        <button type="button" className="ui-btn--primary site-card__action" onClick={() => chooseSite(site.id)}>
          {ACTION_LABEL[site.mode]}
        </button>
      )}

      {data && data.sources.length > 0 ? (
        <Disclosure summary={`Sources (${data.sources.length})`} className="site-card__sources">
          <ul>
            {data.sources.map((source) => (
              <li key={source.id}>
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.title}
                </a>
                <span>{source.credit}</span>
              </li>
            ))}
          </ul>
        </Disclosure>
      ) : (
        <p className="site-card__fallback-source">
          {formatLatLon(site)} ·{' '}
          <a href={site.source.url} target="_blank" rel="noreferrer">
            {site.source.url?.includes('planetarynames') ? 'IAU Gazetteer' : 'Source'}
          </a>
        </p>
      )}
    </>
  );
  return region ? (
    <section className="site-card" aria-label={site.name}>
      {content}
    </section>
  ) : (
    <div className="site-card">{content}</div>
  );
}

export function SiteCard({ site, collapsed = false }: SiteCardProps) {
  const [loaded, setLoaded] = useState<{ id: string; data: SiteCardData | null } | null>(null);
  const data = loaded?.id === site.id ? loaded.data : undefined;

  useEffect(() => {
    let current = true;
    void loadSiteCard(site.id).then((next) => {
      if (current) setLoaded({ id: site.id, data: next });
    });
    return () => {
      current = false;
    };
  }, [site.id]);

  const body: ReactNode = <CardBody site={site} data={data} region={!collapsed} />;
  return collapsed ? (
    <section className="site-card__opened" aria-label={site.name}>
      <span className={`site-card__mode site-card__mode--${site.mode}`}>
        <span aria-hidden="true">{MODE_GLYPH[site.mode]}</span> {modeLabel(site)}
      </span>
      <Disclosure summary="About this site" className="site-card__about">
        {body}
      </Disclosure>
    </section>
  ) : (
    body
  );
}
