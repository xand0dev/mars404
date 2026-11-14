Пакет даних Gale (F3, F6). Генерує pipeline/ (див. pipeline/README.md, docs/SPEC.md §8).

F3: region.json, elevation.f32, slope.f32, hazard.f32 (float32 LE, 256×256), walkable.u8, hirise.jpg, traverse.geojson, source.json, SHA256SUMS.
Шляхи в region.json `files.*` і `layers[].url` — відносно цієї папки, без префікса `gale/` (резолвити `dataUrl('gale/' + шлях)`).
Текстура hirise.jpg покриває рівно `grid.boundsLonLat`, північ угорі. NoData висоти = `region.noData` (-9999) → NaN + walkable 0.
F6: targets.geojson, photos/.
