// Карта шляхів SPEC §9 — єдине джерело для guard, CODEOWNERS та issues.
// Шлях, якого немає в жодній фічі, вважається СПІЛЬНИМ (PR з ним — на рев'ю @xand0dev).

/** @typedef {{ owner: string, nick: string, title: string, allow: string[], deny?: string[] }} Feature */

/** Дозволено кожній фічі на додачу до власних шляхів. `<N>` — номер фічі. */
export const COMMON = ['specs/F<N>/**', 'docs/AI_LOG.md', 'docs/SOURCES.md'];

/** @type {Record<string, Feature>} */
export const FEATURES = {
  F1: { owner: 'Іван', nick: 'gonivanko', title: 'Глобус і вибір місця', allow: ['src/features/globe/**', 'src/features/notes/**', 'public/data/mars/**', 'pipeline/globe/**'] },
  F2: { owner: 'Олександр', nick: 'xand0dev', title: '3D-рельєф і 2D-план', allow: ['src/features/terrain/**'] },
  F3: {
    owner: 'Максим', nick: 'kingsneverdie17', title: 'Дані й шари',
    allow: ['pipeline/**', 'public/data/gale/**', 'src/features/data/**'],
    deny: ['pipeline/globe/**', 'public/data/gale/targets*', 'public/data/gale/photos/**'],
  },
  F4: { owner: 'Влад', nick: 'froozy3', title: 'Маршрут A*', allow: ['src/features/route/**', 'src/core/**'] },
  F5: { owner: 'Влад', nick: 'froozy3', title: 'Бюджет і повернення', allow: ['src/features/budget/**', 'src/core/**'] },
  F6: { owner: 'Настя', nick: 'Bulka0801', title: 'Наукові цілі й фото', allow: ['src/features/science/**', 'src/features/prep/**', 'public/data/gale/targets*', 'public/data/gale/photos/**'] },
  F7: { owner: 'Оля', nick: 'oljyaaa', title: 'UI, HUD, дизайн-токени', allow: ['src/features/hud/**', 'src/ui/**'] },
  F8: { owner: 'Оля', nick: 'oljyaaa', title: 'Демо й сабміт', allow: ['docs/demo/**', 'docs/submission/**', 'README.md'] },
};

/** Явно спільні (SPEC §5.3); будь-який невказаний шлях — теж спільний. */
export const SHARED = [
  'src/contracts/**', 'src/store/**', 'src/app/**', 'src/mocks/**', 'src/main.tsx', 'src/test-setup.ts',
  'package.json', 'package-lock.json', 'vite.config.*', 'tsconfig*.json', 'eslint.config.*', 'index.html',
  '.github/**', 'CONSTITUTION.md', 'AGENTS.md', 'CLAUDE.md', 'docs/SPEC.md', 'specs/_templates/**', 'LICENSE',
];

/** Простий glob: `**` — будь-що, `*` — у межах сегмента. */
export function globToRegExp(glob) {
  const re = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '@@GLOBSTAR@@')
    .replace(/\*/g, '[^/]*')
    .replace(/@@GLOBSTAR@@/g, '.*');
  return new RegExp(`^${re}$`);
}

export const matches = (file, globs) => globs.some((g) => globToRegExp(g).test(file));

/** Шляхи, якими володіє фіча (з COMMON). */
export function ownsFile(id, file) {
  const f = FEATURES[id];
  if (!f) return false;
  const n = id.slice(1);
  const allow = [...f.allow, ...COMMON.map((g) => g.replace('<N>', n))];
  return matches(file, allow) && !matches(file, f.deny ?? []);
}
