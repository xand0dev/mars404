// Щільний рельєф для 3D (files.elevationRender + renderGrid): немає файла чи помилка — null, сцена бере сітку планування.
import { useEffect, useState } from 'react';
import type { Region } from '../../contracts';
import { parseRenderHeights, type RenderHeights } from './lib/hd';
import { regionFileUrl } from './lib/paths';

export function useRenderHeights(region: Region | null, enabled: boolean): RenderHeights | null {
  const file = region?.files.elevationRender;
  const rg = region?.renderGrid;
  const url = enabled && region && file && rg ? regionFileUrl(region.id, file) : null;
  const [state, setState] = useState<{ url: string | null; value: RenderHeights | null }>({ url: null, value: null });

  useEffect(() => {
    if (!url || !rg) return;
    let alive = true;
    fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((buf) => {
        if (!alive) return;
        const rh = parseRenderHeights(buf, rg.width, rg.height, region?.noData);
        if (!rh) console.warn(`elevationRender: expected ${rg.width}×${rg.height} float32, got ${buf.byteLength} bytes`);
        setState({ url, value: rh });
      })
      .catch((e: unknown) => {
        if (alive) {
          console.warn(`elevationRender not loaded: ${String(e)}`);
          setState({ url, value: null });
        }
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- url уже містить region / file; rg і noData з того самого region
  }, [url]);

  return url && state.url === url ? state.value : null;
}
