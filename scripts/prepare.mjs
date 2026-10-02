// Turns the project checkout (DOCS_SOURCE) into Docusaurus input under generated/:
//   content/                 docs folder + included files
//   static/cpp-api/          Doxygen HTML
//   doxygen-warnings/<id>.log
//   build-info.json          commit and version, shown in the footer
import {execFileSync} from 'node:child_process';
import {cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {join, posix, relative, resolve} from 'node:path';
import {contentDir, generatedDir, project, rootDir, sourceDir} from './config.mjs';

function git(dir, ...args) {
  try {
    return execFileSync('git', ['-C', dir, ...args], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim();
  } catch {
    return '';
  }
}

// Sparse checkouts lack most files, so fall back to the committed tree.
function repoPathKind(src, repoPath) {
  const abs = join(src, repoPath);
  if (existsSync(abs)) return statSync(abs).isDirectory() ? 'tree' : 'blob';
  const entry = git(src, 'ls-tree', 'HEAD', '--', repoPath);
  return entry ? entry.split(/\s+/)[1] : undefined;
}

function rewriteLinks(project, src, markdown, srcFile) {
  const github = `https://github.com/${project.repo}`;
  return markdown.replace(/(!?)\[([^\]]*)\]\(([^)\s]+)\)/g, (match, bang, text, link) => {
    if (/^([a-z][a-z0-9+.-]*:|#|\/)/i.test(link)) return match;
    const [path, hash] = link.split('#');
    const repoPath = posix.normalize(posix.join(posix.dirname(srcFile), path));
    const kind = repoPath.startsWith('..') ? undefined : repoPathKind(src, repoPath);
    if (!kind) throw new Error(`${project.id}:${srcFile}: broken relative link "${link}"`);
    const url = bang
      ? `https://raw.githubusercontent.com/${project.repo}/main/${repoPath}`
      : `${github}/${kind}/main/${repoPath}`;
    return `${bang}[${text}](${url}${hash ? `#${hash}` : ''})`;
  });
}

function includeFile(project, src, inc) {
  const body = readFileSync(join(src, inc.src), 'utf8').replace(/^\s*# .*\n/, '');
  const frontMatter = [
    '---',
    `title: ${JSON.stringify(inc.title)}`,
    inc.description && `description: ${JSON.stringify(inc.description)}`,
    inc.sidebarPosition !== undefined && `sidebar_position: ${inc.sidebarPosition}`,
    `custom_edit_url: https://github.com/${project.repo}/edit/main/${inc.src}`,
    '---',
  ]
    .filter(Boolean)
    .join('\n');
  const note = `:::note\n\nThis page is generated from [\`${inc.src}\`](https://github.com/${project.repo}/blob/main/${inc.src}).\n\n:::\n`;
  const dest = join(contentDir, inc.dest);
  if (existsSync(dest)) throw new Error(`${project.id}: include target ${inc.dest} already exists in ${project.docsDir}/`);
  mkdirSync(resolve(dest, '..'), {recursive: true});
  writeFileSync(dest, `${frontMatter}\n\n${note}\n${rewriteLinks(project, src, body, inc.src)}`);
}

function runDoxygen(project, src, info) {
  const inputs = project.doxygen.inputs.map((p) => join(src, p));
  for (const input of inputs) {
    if (!existsSync(input)) throw new Error(`${project.id}: Doxygen input ${relative(rootDir, input)} not found`);
  }
  const workDir = join(generatedDir, 'doxygen', project.id);
  mkdirSync(workDir, {recursive: true});
  const mainpage = join(workDir, 'mainpage.md');
  writeFileSync(
    mainpage,
    [
      `# ${project.title} C++ API Reference {#mainpage}`,
      '',
      `Generated from the headers in ${project.doxygen.inputs.map((p) => `\`${p}\``).join(', ')} of [${project.repo}](https://github.com/${project.repo}).`,
      '',
      'Start with the [Classes](annotated.html) or [Files](files.html) index, or use the search box.',
      '',
      `Guides are in the <a href="../${project.startDoc}">${project.title} documentation</a>.`,
      '',
    ].join('\n'),
  );

  const outDir = join(generatedDir, 'static');
  const logDir = join(generatedDir, 'doxygen-warnings');
  mkdirSync(outDir, {recursive: true});
  mkdirSync(logDir, {recursive: true});
  const q = (s) => JSON.stringify(s);
  const css = ['doxygen-awesome.css', 'doxygen-awesome-sidebar-only.css'].map((f) => q(join(rootDir, 'doxygen/doxygen-awesome', f)));
  const config = [
    readFileSync(join(rootDir, 'doxygen/Doxyfile'), 'utf8'),
    `PROJECT_NAME = ${q(project.title)}`,
    `PROJECT_NUMBER = ${q([info.version, info.commit && `(${info.commit})`].filter(Boolean).join(' '))}`,
    `PROJECT_LOGO = ${q(join(rootDir, 'static/img/logo.svg'))}`,
    `OUTPUT_DIRECTORY = ${q(outDir)}`,
    `INPUT = ${[mainpage, ...inputs].map(q).join(' ')}`,
    `USE_MDFILE_AS_MAINPAGE = ${q(mainpage)}`,
    `STRIP_FROM_PATH = ${q(src)}`,
    `STRIP_FROM_INC_PATH = ${inputs.map(q).join(' ')}`,
    `HTML_EXTRA_STYLESHEET = ${css.join(' ')}`,
    `WARN_LOGFILE = ${q(join(logDir, `${project.id}.log`))}`,
  ].join('\n');
  console.log(`${project.id}: running Doxygen`);
  execFileSync('doxygen', ['-'], {input: config, stdio: ['pipe', 'inherit', 'inherit']});
}

rmSync(generatedDir, {recursive: true, force: true});

const src = sourceDir;
const info = {
  commit: git(src, 'rev-parse', '--short=8', 'HEAD'),
  version: project.versionFile ? readFileSync(join(src, project.versionFile), 'utf8').trim() : undefined,
};

mkdirSync(contentDir, {recursive: true});
const docs = project.docsDir && join(src, project.docsDir);
if (docs && existsSync(docs)) cpSync(docs, contentDir, {recursive: true});
for (const inc of project.include ?? []) includeFile(project, src, inc);
if (project.typedoc?.length) {
  mkdirSync(join(contentDir, 'ts-api'), {recursive: true});
  writeFileSync(join(contentDir, 'ts-api', '_category_.json'), JSON.stringify({label: 'TypeScript API', position: 100}));
}
if (project.doxygen) runDoxygen(project, src, info);

writeFileSync(join(generatedDir, 'build-info.json'), `${JSON.stringify(info, null, 2)}\n`);
console.log(`${project.id}: prepared from ${relative(rootDir, src) || '.'}${info.commit ? ` @ ${info.commit}` : ''}`);
