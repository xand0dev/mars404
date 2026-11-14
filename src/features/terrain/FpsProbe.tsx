// Замір FPS (F2-AC5): лише з ?fps у URL. Прогрів, далі 60 секундних вибірок, медіана.
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { FPS_WARMUP_S, FPS_WINDOW_S, median } from './lib/fps';

export interface FpsReport {
  phase: 'warmup' | 'measuring' | 'done';
  lastFps: number;
  samples: number;
  median: number | null;
}

export function FpsProbe({ onReport }: { onReport: (r: FpsReport) => void }) {
  const st = useRef({ start: -1, secStart: -1, frames: 0, samples: [] as number[], done: false });
  useFrame(() => {
    const s = st.current;
    if (s.done) return;
    const now = performance.now() / 1000;
    if (s.start < 0) {
      s.start = now;
      s.secStart = now;
    }
    s.frames++;
    if (now - s.secStart < 1) return;
    const fps = s.frames / (now - s.secStart);
    s.frames = 0;
    s.secStart = now;
    const warm = now - s.start >= FPS_WARMUP_S;
    if (warm) s.samples.push(fps);
    s.done = s.samples.length >= FPS_WINDOW_S;
    onReport({
      phase: s.done ? 'done' : warm ? 'measuring' : 'warmup',
      lastFps: Math.round(fps),
      samples: s.samples.length,
      median: median(s.samples),
    });
  });
  return null;
}
