// Експорт / імпорт міток екіпажу як AnnotationsFile (SPEC §7.12, F1-AC6). Чисті функції без React.
import type { Annotation, AnnotationKind, AnnotationsFile, SiteId } from '../../contracts';

export const ANNOTATION_KINDS: readonly AnnotationKind[] = ['impassable', 'hazard', 'note', 'plan'];

export function toAnnotationsFile(site: SiteId, annotations: readonly Annotation[], now = new Date()): AnnotationsFile {
  return { schemaVersion: 1, site, exportedAt: now.toISOString(), annotations: [...annotations] };
}

export type ParseResult = { ok: true; annotations: Annotation[] } | { ok: false; error: string };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isIso = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v) && !Number.isNaN(Date.parse(v));

/** Перевіряє одну мітку; повертає текст помилки або null. Спільне з читанням localStorage. */
export function annotationError(v: unknown): string | null {
  if (!isObj(v)) return 'mark is not an object';
  if (typeof v.id !== 'string' || v.id === '') return 'mark without id';
  if (!ANNOTATION_KINDS.includes(v.kind as AnnotationKind)) return `unknown mark type "${String(v.kind)}"`;
  const c = v.coordinates;
  if (!Array.isArray(c) || c.length !== 2 || !c.every((n) => typeof n === 'number' && Number.isFinite(n))) return `mark ${v.id}: coordinates must be two numbers`;
  if (typeof v.radiusM !== 'number' || !Number.isFinite(v.radiusM) || v.radiusM < 0) return `mark ${v.id}: radius must be ≥ 0 m`;
  if (typeof v.text !== 'string') return `mark ${v.id}: text must be a string`;
  if (!isIso(v.createdAt)) return `mark ${v.id}: createdAt must be an ISO time`;
  return null;
}

const toAnnotation = (v: Record<string, unknown>, origin: Annotation['origin']): Annotation => {
  const [x, y] = v.coordinates as [number, number];
  return { id: v.id as string, kind: v.kind as AnnotationKind, coordinates: [x, y], radiusM: v.radiusM as number, text: v.text as string, createdAt: v.createdAt as string, origin };
};

/** Розбирає файл експорту. Усі мітки з файла отримують origin = 'imported'. */
export function parseAnnotationsFile(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'not a JSON file' };
  }
  if (!isObj(data)) return { ok: false, error: 'not an AnnotationsFile object' };
  if (data.schemaVersion !== 1) return { ok: false, error: `unsupported schemaVersion ${String(data.schemaVersion)}` };
  if (data.site !== 'gale') return { ok: false, error: `marks are for site "${String(data.site)}", not Gale` };
  if (!Array.isArray(data.annotations)) return { ok: false, error: 'annotations must be a list' };
  const ids = new Set<string>();
  for (const a of data.annotations) {
    const err = annotationError(a);
    if (err) return { ok: false, error: err };
    const id = (a as Annotation).id;
    if (ids.has(id)) return { ok: false, error: `duplicate mark id ${id}` };
    ids.add(id);
  }
  return { ok: true, annotations: (data.annotations as Record<string, unknown>[]).map((a) => toAnnotation(a, 'imported')) };
}

/** Злиття при імпорті: поточні лишаються на місці, імпортовані додаються; той самий id — береться імпортована. */
export function mergeImported(current: readonly Annotation[], imported: readonly Annotation[]): Annotation[] {
  const byId = new Map(imported.map((a) => [a.id, a]));
  const kept = current.map((a) => byId.get(a.id) ?? a);
  const keptIds = new Set(kept.map((a) => a.id));
  return [...kept, ...imported.filter((a) => !keptIds.has(a.id))];
}

/** Відновлення зі сховища: лише валідні мітки, origin зберігається. */
export function restoreAnnotations(v: unknown): Annotation[] {
  if (!Array.isArray(v)) return [];
  return v.filter((a) => annotationError(a) === null).map((a) => {
    const r = a as Record<string, unknown>;
    return toAnnotation(r, r.origin === 'imported' ? 'imported' : 'this-eva');
  });
}
