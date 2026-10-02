// Loads and validates a source repo's docs.config.json. The file is data only; nothing from the repo is executed.
import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

export const CONFIG_FILE = 'docs.config.json';

const id = /^[a-z0-9][a-z0-9-]*$/;
const repoPath = (v) => !v.startsWith('/') && !v.split('/').includes('..') && !v.includes('\\');

// Spec forms: a string kind, {enum}, {array}, or {object, required}.
const kinds = {
  string: () => true,
  id: (v) => id.test(v),
  path: repoPath,
  url: (v) => /^https?:\/\/[^\s]+$/.test(v),
  repo: (v) => /^[\w.-]+\/[\w.-]+$/.test(v),
};
const include = {
  object: {src: 'path', dest: 'path', title: 'string', description: 'string', sidebarPosition: 'number'},
  required: ['src', 'dest', 'title'],
};
const schema = {
  object: {
    id: 'id',
    title: 'string',
    tagline: 'string',
    repo: 'repo',
    visibility: {enum: ['public', 'internal']},
    url: 'url',
    docsDir: 'path',
    versionFile: 'path',
    startDoc: 'path',
    license: 'string',
    include: {array: include},
    doxygen: {object: {inputs: {array: 'path'}}, required: ['inputs']},
    typedoc: {array: {object: {name: 'id', dir: 'path'}, required: ['name', 'dir']}},
    landing: {array: {object: {title: 'string', description: 'string', doc: 'path'}, required: ['title', 'description', 'doc']}},
    links: {array: {object: {label: 'string', url: 'url'}, required: ['label', 'url']}},
  },
  required: ['id', 'title', 'tagline', 'repo', 'visibility', 'startDoc'],
};

function check(value, spec, at, errors) {
  if (typeof spec === 'string') {
    if (spec === 'number') {
      if (typeof value !== 'number') errors.push(`${at}: expected a number`);
    } else if (typeof value !== 'string' || value === '') {
      errors.push(`${at}: expected a non-empty string`);
    } else if (/[\u0000-\u001f]/.test(value)) {
      errors.push(`${at}: must not contain line breaks or control characters`);
    } else if (!kinds[spec](value)) {
      errors.push(`${at}: invalid ${spec} "${value}"`);
    }
  } else if (spec.enum) {
    if (!spec.enum.includes(value)) errors.push(`${at}: must be one of ${spec.enum.join(', ')}`);
  } else if (spec.array) {
    if (!Array.isArray(value)) return errors.push(`${at}: expected an array`);
    value.forEach((v, i) => check(v, spec.array, `${at}[${i}]`, errors));
  } else {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return errors.push(`${at}: expected an object`);
    for (const key of Object.keys(value)) {
      if (!(key in spec.object)) errors.push(`${at}.${key}: unknown field`);
      else check(value[key], spec.object[key], `${at}.${key}`, errors);
    }
    for (const key of spec.required ?? []) {
      if (!(key in value)) errors.push(`${at}.${key}: required`);
    }
  }
}

/** @returns {import('../src/types').Project} */
export function loadProject(sourceDir) {
  const file = join(sourceDir, CONFIG_FILE);
  if (!existsSync(file)) throw new Error(`${file} not found. Set DOCS_SOURCE to a checkout with a ${CONFIG_FILE}.`);
  let config;
  try {
    config = JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`${file}: ${err.message}`);
  }
  const errors = [];
  check(config, schema, CONFIG_FILE, errors);
  if (errors.length) throw new Error(`Invalid ${file}:\n  ${errors.join('\n  ')}`);
  return config;
}

/** Repo paths a build needs, used for sparse checkouts. */
export function sparsePaths(project) {
  return [
    CONFIG_FILE,
    project.docsDir,
    project.versionFile,
    ...(project.include ?? []).map((i) => i.src),
    ...(project.doxygen?.inputs ?? []),
    ...(project.typedoc ?? []).flatMap((t) => [`${t.dir}/src`, `${t.dir}/tsconfig.json`, `${t.dir}/package.json`]),
  ].filter(Boolean);
}
