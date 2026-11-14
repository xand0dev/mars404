// Завантаження traverse.geojson (T12). Помилка — попередження на екрані, без вигаданої лінії.
import { useEffect, useState } from 'react';
import { parseTraverse, type ParsedTraverse } from './lib/traverse';

export type TraverseState = { status: 'none' } | { status: 'loading' } | ({ status: 'ready' } & ParsedTraverse) | { status: 'error'; message: string };

export function useTraverse(url: string | null): TraverseState {
  const [state, setState] = useState<{ url: string | null; value: TraverseState }>({ url: null, value: { status: 'none' } });

  useEffect(() => {
    if (url === null) return;
    let alive = true;
    const done = (value: TraverseState) => alive && setState({ url, value });
    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        done({ status: 'ready', ...parseTraverse(await r.json()) });
      })
      .catch((e: unknown) => done({ status: 'error', message: e instanceof Error ? e.message : String(e) }));
    return () => {
      alive = false;
    };
  }, [url]);

  if (url === null) return { status: 'none' };
  return state.url === url ? state.value : { status: 'loading' };
}
