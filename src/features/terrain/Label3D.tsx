// Підпис у 3D як спрайт з canvas-текстурою: без DOM-коренів (drei Html створює окремий React-root на кожен підпис).
import { useEffect, useMemo } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';

const PX = 40;

function makeLabel(text: string, color: string): { texture: CanvasTexture; aspect: number } | null {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const font = `600 ${PX}px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`;
  ctx.font = font;
  const pad = PX * 0.4;
  const w = Math.ceil(ctx.measureText(text).width + pad * 2);
  const h = Math.ceil(PX * 1.5);
  c.width = w;
  c.height = h;
  ctx.font = font;
  ctx.fillStyle = 'rgba(20,16,14,0.85)';
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, PX * 0.35);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, pad, h / 2 + 1);
  const texture = new CanvasTexture(c);
  texture.colorSpace = SRGBColorSpace;
  return { texture, aspect: w / h };
}

/** Розмір підпису — частка висоти полотна (не залежить від відстані камери). */
const HEIGHT = 0.036;

export function Label3D({ text, color = '#f3ece6', position }: { text: string; color?: string; position: [number, number, number] }) {
  const label = useMemo(() => makeLabel(text, color), [text, color]);
  useEffect(() => () => label?.texture.dispose(), [label]);
  if (!label) return null;
  return (
    <sprite position={position} center={[0.5, 0]} scale={[HEIGHT * label.aspect, HEIGHT, 1]} renderOrder={20}>
      <spriteMaterial map={label.texture} sizeAttenuation={false} depthTest={false} depthWrite={false} transparent />
    </sprite>
  );
}
