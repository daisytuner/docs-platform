// Checks key pages of a served build: node scripts/smoke-test.mjs http://localhost:8080
// Uses the same DOCS_SOURCE as the build.
import {baseUrl, project} from './config.mjs';

const origin = (process.argv[2] || 'http://localhost:8080').replace(/\/$/, '');
const site = (path) => `${baseUrl}${path.replace(/^\//, '')}`;

const checks = [
  ['/', baseUrl === '/' ? 200 : 302],
  ...(baseUrl === '/' ? [] : [[baseUrl, 200]]),
  [site('does-not-exist'), 404],
  [site(project.startDoc), 200],
  ...(project.include ?? []).map((inc) => [site(inc.dest.replace(/\.mdx?$/, '')), 200]),
  ...(project.doxygen ? [[site('cpp-api/index.html'), 200]] : []),
  ...(project.typedoc ?? []).map((t) => [site(`ts-api/${t.name}`), 200]),
];

for (let i = 0; ; i++) {
  try {
    await fetch(origin, {redirect: 'manual'});
    break;
  } catch (err) {
    if (i === 30) throw err;
    await new Promise((r) => setTimeout(r, 1000));
  }
}

let failed = 0;
for (const [path, expected] of new Map(checks)) {
  const res = await fetch(`${origin}${path}`, {redirect: 'manual'});
  const ok = res.status === expected;
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${path} -> ${res.status} (expected ${expected})`);
}
process.exit(failed ? 1 : 0);
