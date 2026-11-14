// Координати глобуса (F1). Чиста функція без React і стану.
const DEG = Math.PI / 180;

/**
 * Планетоцентричні lat/lon (°, довгота на схід) → точка на сфері в осях R3F:
 * lon 0 → +X, lon +90 → −Z, lat +90 → +Y (F1-AC4).
 * Збігається з UV `THREE.SphereGeometry` для еквірект. текстури lon −180…180.
 */
export function latLonToSphere(latDeg: number, lonDeg: number, radius = 1): [number, number, number] {
  const lat = latDeg * DEG;
  const lon = lonDeg * DEG;
  const c = Math.cos(lat);
  return [radius * c * Math.cos(lon), radius * Math.sin(lat), -radius * c * Math.sin(lon)];
}
