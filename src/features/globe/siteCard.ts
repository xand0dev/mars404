// Контент прев’ю-карток (#112): безпечний loader поверх статичних JSON з F6.
import type { Evidence } from '../../contracts';
import { dataUrl } from '../../contracts/planning';
import type { SiteMode } from './sites';

export interface SiteCardFact {
  label: string;
  value: string;
  sourceId: string;
}

export interface SiteCardImage {
  file: string;
  alt: string;
  credit: string;
  sourceUrl: string;
  status: Evidence;
}

export interface SiteCardSource {
  id: string;
  title: string;
  url: string;
  credit: string;
  accessedAt: string;
  status: Evidence;
}

export interface SiteCardData {
  schemaVersion: 1;
  id: string;
  title?: string;
  subtitle?: string;
  mode: SiteMode;
  summary?: string;
  whyGo?: string;
  facts: SiteCardFact[];
  image: SiteCardImage | null;
  sources: SiteCardSource[];
}

const cache = new Map<string, Promise<SiteCardData | null>>();
const MODES = new Set<SiteMode>(['eva', 'overview', 'card']);
const EVIDENCE = new Set<Evidence>(['verified', 'assumption', 'mock', 'pending']);

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown, max: number): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max ? value : undefined;
const evidence = (value: unknown): value is Evidence => typeof value === 'string' && EVIDENCE.has(value as Evidence);
const webUrl = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

function invalid(siteId: string, field: string): void {
  console.warn(`[site-card:${siteId}] invalid ${field}; field skipped`);
}

function optionalText(root: Record<string, unknown>, key: string, max: number, siteId: string): string | undefined {
  const value = text(root[key], max);
  if (value === undefined) invalid(siteId, key);
  return value;
}

function parseSource(value: unknown, siteId: string, index: number): SiteCardSource | null {
  if (!record(value)) {
    invalid(siteId, `sources[${index}]`);
    return null;
  }
  const id = text(value.id, 120);
  const title = text(value.title, 200);
  const credit = text(value.credit, 200);
  const accessedAt = text(value.accessedAt, 10);
  if (!id || !title || !credit || !accessedAt || !/^\d{4}-\d{2}-\d{2}$/.test(accessedAt) || !webUrl(value.url) || !evidence(value.status)) {
    invalid(siteId, `sources[${index}]`);
    return null;
  }
  return { id, title, url: value.url, credit, accessedAt, status: value.status };
}

function parseImage(value: unknown, siteId: string): SiteCardImage | null {
  if (!record(value)) {
    invalid(siteId, 'image');
    return null;
  }
  const file = text(value.file, 120);
  const alt = text(value.alt, 240);
  const credit = text(value.credit, 200);
  if (!file || !/^[a-z0-9-]+\.jpe?g$/i.test(file) || !alt || !credit || !webUrl(value.sourceUrl) || !evidence(value.status)) {
    invalid(siteId, 'image');
    return null;
  }
  return { file, alt, credit, sourceUrl: value.sourceUrl, status: value.status };
}

/** Невалідна схема / id / mode відкидає файл; інші поля пропускаються з warning. */
export function parseSiteCard(value: unknown, requestedId: string): SiteCardData | null {
  if (!record(value) || value.schemaVersion !== 1 || value.id !== requestedId || typeof value.mode !== 'string' || !MODES.has(value.mode as SiteMode)) {
    invalid(requestedId, 'root schema, id or mode');
    return null;
  }

  const sources = Array.isArray(value.sources)
    ? value.sources.map((source, index) => parseSource(source, requestedId, index)).filter((source): source is SiteCardSource => source !== null)
    : (invalid(requestedId, 'sources'), []);
  const sourceIds = new Set(sources.map((source) => source.id));
  const facts = Array.isArray(value.facts)
    ? value.facts
        .map((fact, index): SiteCardFact | null => {
          if (!record(fact)) {
            invalid(requestedId, `facts[${index}]`);
            return null;
          }
          const label = text(fact.label, 40);
          const factValue = text(fact.value, 60);
          const sourceId = text(fact.sourceId, 120);
          if (!label || !factValue || !sourceId || !sourceIds.has(sourceId)) {
            invalid(requestedId, `facts[${index}]`);
            return null;
          }
          return { label, value: factValue, sourceId };
        })
        .filter((fact): fact is SiteCardFact => fact !== null)
        .slice(0, 4)
    : (invalid(requestedId, 'facts'), []);

  return {
    schemaVersion: 1,
    id: requestedId,
    title: optionalText(value, 'title', 40, requestedId),
    subtitle: optionalText(value, 'subtitle', 60, requestedId),
    mode: value.mode as SiteMode,
    summary: optionalText(value, 'summary', 320, requestedId),
    whyGo: optionalText(value, 'whyGo', 160, requestedId),
    facts,
    image: parseImage(value.image, requestedId),
    sources,
  };
}

export function loadSiteCard(siteId: string): Promise<SiteCardData | null> {
  const cached = cache.get(siteId);
  if (cached) return cached;
  const request = fetch(dataUrl(`sites/${siteId}.json`))
    .then(async (response) => (response.ok ? parseSiteCard(await response.json(), siteId) : null))
    .catch(() => null);
  cache.set(siteId, request);
  return request;
}

/** Для тестів і повторної спроби після зміни набору статичних даних. */
export function clearSiteCardCache(): void {
  cache.clear();
}
