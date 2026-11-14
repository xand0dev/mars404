// Path-guard (SPEC §10). Використання: git diff --name-only … | node .github/scripts/guard.mjs <branch>
// stdout: лише JSON { feature, own, shared, foreign }; анотації — у stderr. Код 1, якщо PR чіпає чужу фічу.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { FEATURES, ownsFile } from './paths.mjs';

/** feat/F3, feat/F3-data, feat/F3/fix → 'F3'; інакше null. */
export function featureOfBranch(branch) {
  const m = /^feat\/(F[0-8])(?:[-/].*)?$/.exec(branch ?? '');
  return m ? m[1] : null;
}

export function classify(branch, files) {
  const feature = featureOfBranch(branch);
  const result = { feature, own: [], shared: [], foreign: [] };
  for (const file of files.map((f) => f.trim()).filter(Boolean)) {
    if (feature && ownsFile(feature, file)) result.own.push(file);
    else if (feature && feature !== 'F0' && Object.keys(FEATURES).some((id) => id !== feature && ownsFile(id, file))) result.foreign.push(file);
    else result.shared.push(file);
  }
  return result;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const branch = process.argv[2] ?? '';
  const files = readFileSync(0, 'utf8').split('\n');
  const r = classify(branch, files);
  console.log(JSON.stringify(r, null, 2));
  if (!r.feature) console.error(`::notice::Гілка «${branch}» не feat/F<N> — усі файли вважаються спільними.`);
  if (r.shared.length) console.error(`::notice::Спільні файли (потрібне рев'ю @xand0dev): ${r.shared.join(', ')}`);
  if (r.foreign.length) {
    console.error(`::error::PR чіпає папки інших фіч: ${r.foreign.join(', ')}`);
    process.exit(1);
  }
}
