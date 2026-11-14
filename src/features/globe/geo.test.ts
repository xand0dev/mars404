import { describe, expect, it } from 'vitest';
import { SphereGeometry } from 'three';
import { latLonToSphere } from './geo';

// F1-AC4: маркери стоять у точках latLonToSphere (lon 0 → +X, lon +90 → −Z, lat +90 → +Y), узгоджено з текстурою.
describe('latLonToSphere (F1-AC4)', () => {
  // 6 знаків: буфери SphereGeometry — Float32
  const close = (a: readonly number[], b: readonly number[], digits = 9) =>
    a.forEach((v, i) => expect(v).toBeCloseTo(b[i] ?? NaN, digits));

  it('Given lat 0, lon 0; Then +X', () => close(latLonToSphere(0, 0), [1, 0, 0]));
  it('Given lon +90 (схід); Then −Z', () => close(latLonToSphere(0, 90), [0, 0, -1]));
  it('Given lon −90 і lon 180; Then +Z і −X', () => {
    close(latLonToSphere(0, -90), [0, 0, 1]);
    close(latLonToSphere(0, 180), [-1, 0, 0]);
  });
  it('Given lat +90 / −90; Then +Y / −Y', () => {
    close(latLonToSphere(90, 0), [0, 1, 0]);
    close(latLonToSphere(-90, 0), [0, -1, 0]);
  });
  it('Given радіус r; Then точка лежить на сфері радіуса r', () => {
    const [x, y, z] = latLonToSphere(-5.37, 137.81, 1.02);
    expect(Math.hypot(x, y, z)).toBeCloseTo(1.02, 9);
  });

  it('узгоджено з UV SphereGeometry для еквірект. текстури lon −180…180 (u = (lon+180)/360, v = (lat+90)/180)', () => {
    const g = new SphereGeometry(1, 24, 16);
    const pos = g.getAttribute('position');
    const uv = g.getAttribute('uv');
    for (let i = 0; i < pos.count; i++) {
      const u = uv.getX(i);
      const v = uv.getY(i);
      const lat = v * 180 - 90;
      if (Math.abs(lat) > 89.999) continue; // на полюсах довгота невизначена
      close(latLonToSphere(lat, u * 360 - 180), [pos.getX(i), pos.getY(i), pos.getZ(i)], 6);
    }
    g.dispose();
  });
});
