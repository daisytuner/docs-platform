// Prints the sparse-checkout patterns a project's docs build needs:
//   node scripts/sparse-paths.mjs <checkout containing docs.config.json>
import {loadProject, sparsePaths} from './project.mjs';

const dir = process.argv[2];
if (!dir) throw new Error('usage: node scripts/sparse-paths.mjs <checkout>');
console.log(sparsePaths(loadProject(dir)).map((p) => `/${p}`).join('\n'));
