// Необов'язкова текстура (HiRISE, шари): помилка завантаження не ламає сцену.
import { useEffect, useState } from 'react';
import { SRGBColorSpace, TextureLoader, type Texture } from 'three';

export type TextureState = { status: 'none' } | { status: 'loading' } | { status: 'ready'; texture: Texture } | { status: 'error' };

export function useOptionalTexture(url: string | null, enabled = true): TextureState {
  const [state, setState] = useState<{ url: string | null; value: TextureState }>({ url: null, value: { status: 'none' } });
  const active = enabled && url !== null;

  useEffect(() => {
    if (!active || url === null) return;
    let alive = true;
    let tex: Texture | null = null;
    new TextureLoader().load(
      url,
      (t) => {
        t.colorSpace = SRGBColorSpace;
        // Під косим кутом камери анізотропна фільтрація прибирає «мило» вдалині.
        t.anisotropy = 8;
        tex = t;
        if (alive) setState({ url, value: { status: 'ready', texture: t } });
        else t.dispose();
      },
      undefined,
      () => alive && setState({ url, value: { status: 'error' } }),
    );
    return () => {
      alive = false;
      tex?.dispose();
    };
  }, [url, active]);

  if (!active) return { status: 'none' };
  return state.url === url ? state.value : { status: 'loading' };
}
