// Build settings shared by the scripts and docusaurus.config.ts. A build covers exactly one project:
//   DOCS_SOURCE=path    checkout of the project's repo containing docs.config.json (default: source/)
//   DOCS_NOINDEX=false  lets search engines index a public site
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadProject} from './project.mjs';

export const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const generatedDir = resolve(rootDir, 'generated');
export const contentDir = resolve(generatedDir, 'content');
export const sourceDir = resolve(rootDir, process.env.DOCS_SOURCE || 'source');

export const project = loadProject(sourceDir);
export const isPublic = project.visibility === 'public';

// Public sites are mounted at docs.daisytuner.com/<id>/ by Firebase Hosting; internal ones own their host.
export const baseUrl = isPublic ? `/${project.id}/` : '/';
