// Опис текстури глобуса (F1-AC4). Файл і credit беремо з public/data/mars/source.json (готує pipeline/globe, T6):
// без валідного опису текстуру не показуємо — лишається процедурна сфера з «MOCK».

/** Шлях відносно public/data (через dataUrl). */
export const TEXTURE_META_PATH = 'mars/source.json';

export interface TextureMeta {
  /** Ім'я файлу в public/data/mars/ */
  file: string;
  credit: string;
  sourceUrl: string;
}

const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

export function parseTextureMeta(v: unknown): TextureMeta | null {
  if (typeof v !== 'object' || v === null) return null;
  const { file, credit, sourceUrl } = v as Record<string, unknown>;
  if (!nonEmpty(file) || !nonEmpty(credit) || !nonEmpty(sourceUrl)) return null;
  if (file.includes('/') || file.includes('\\')) return null;
  return { file, credit, sourceUrl };
}
