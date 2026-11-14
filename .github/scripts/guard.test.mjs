import { describe, expect, it } from 'vitest';
import { classify, featureOfBranch } from './guard.mjs';
import { FEATURES, ownsFile } from './paths.mjs';

describe('guard (F0-AC2)', () => {
  it('назва гілки → фіча', () => {
    expect(featureOfBranch('feat/F3')).toBe('F3');
    expect(featureOfBranch('feat/F6-photos')).toBe('F6');
    expect(featureOfBranch('feat/F9')).toBeNull();
    expect(featureOfBranch('fix/thing')).toBeNull();
  });

  it('свої шляхи, спека, свій розділ логів — own', () => {
    const r = classify('feat/F4', ['src/features/route/RoutePanel.tsx', 'src/core/astar.ts', 'specs/F4/spec.md', 'docs/AI_LOG.md', 'docs/SOURCES.md']);
    expect(r.own).toHaveLength(5);
    expect(r.shared).toEqual([]);
    expect(r.foreign).toEqual([]);
  });

  it('чужа папка — foreign', () => {
    expect(classify('feat/F7', ['src/features/route/x.ts']).foreign).toEqual(['src/features/route/x.ts']);
    expect(classify('feat/F1', ['specs/F2/spec.md']).foreign).toEqual(['specs/F2/spec.md']);
  });

  it('спільні й невказані шляхи — shared', () => {
    const r = classify('feat/F6', ['src/contracts/index.ts', 'package.json', '.github/workflows/ci.yml', 'some/new/file.txt']);
    expect(r.shared).toHaveLength(4);
    expect(r.foreign).toEqual([]);
  });

  it('гілка не feat/F<N> — усе shared', () => {
    expect(classify('contract/add-field', ['src/features/route/x.ts']).shared).toHaveLength(1);
  });

  it('межа F3 / F6 / F1 у public/data і pipeline', () => {
    expect(ownsFile('F3', 'public/data/gale/region.json')).toBe(true);
    expect(ownsFile('F3', 'public/data/gale/targets.geojson')).toBe(false);
    expect(ownsFile('F6', 'public/data/gale/targets.geojson')).toBe(true);
    expect(ownsFile('F6', 'public/data/gale/photos/a.jpg')).toBe(true);
    expect(ownsFile('F3', 'public/data/gale/photos/a.jpg')).toBe(false);
    expect(ownsFile('F3', 'pipeline/globe/make.py')).toBe(false);
    expect(ownsFile('F1', 'pipeline/globe/make.py')).toBe(true);
  });

  it('нові райони (15.11): пакет — F3, цілі й фото — F6', () => {
    expect(ownsFile('F3', 'public/data/columbia-hills/region.json')).toBe(true);
    expect(ownsFile('F3', 'public/data/olympus-mons/elevation.f32')).toBe(true);
    expect(ownsFile('F3', 'public/data/valles-marineris/texture.jpg')).toBe(true);
    expect(ownsFile('F3', 'public/data/columbia-hills/targets.geojson')).toBe(false);
    expect(ownsFile('F6', 'public/data/columbia-hills/targets.geojson')).toBe(true);
    expect(ownsFile('F6', 'public/data/columbia-hills/photos/home-plate.jpg')).toBe(true);
    expect(ownsFile('F3', 'public/data/mars/x.jpg')).toBe(false);
  });

  it('нові папки: notes — F1, prep — F6', () => {
    expect(ownsFile('F1', 'src/features/notes/NotesPanel.tsx')).toBe(true);
    expect(ownsFile('F6', 'src/features/prep/ChecklistPanel.tsx')).toBe(true);
  });

  it('F4 і F5 ділять src/core', () => {
    expect(ownsFile('F4', 'src/core/index.ts') && ownsFile('F5', 'src/core/index.ts')).toBe(true);
    expect(Object.keys(FEATURES)).toHaveLength(8);
  });
});
