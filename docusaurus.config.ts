import {themes as prismThemes} from 'prism-react-renderer';
import {existsSync, readFileSync} from 'node:fs';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import type {Config, PluginConfig} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import type {NavbarItem} from '@docusaurus/theme-common';
import {baseUrl, contentDir, isPublic, project as loadedProject, sourceDir} from './scripts/config.mjs';
import cppApiLinks from './src/remark/cpp-api-links.mjs';
import type {Project} from './src/types';

const project = loadedProject as Project;
// Only the origin matters; baseUrl adds the path.
const siteUrl = project.url ? new URL(project.url).origin : 'http://localhost:3000';
// Public: indexable once DOCS_NOINDEX=false. Internal: never.
const noIndex = !isPublic || process.env.DOCS_NOINDEX !== 'false';

const buildInfoFile = join(__dirname, 'generated/build-info.json');
const buildInfo: {commit?: string; version?: string} = existsSync(buildInfoFile)
  ? JSON.parse(readFileSync(buildInfoFile, 'utf8'))
  : {};

const cppApiHref = 'pathname:///cpp-api/index.html';
const github = `https://github.com/${project.repo}`;

const typedocPlugins: PluginConfig[] = (project.typedoc ?? []).map((t) => [
  'docusaurus-plugin-typedoc',
  {
    id: `typedoc-${t.name}`,
    name: t.name,
    entryPoints: [join(sourceDir, t.dir, 'src')],
    entryPointStrategy: 'expand',
    tsconfig: join(sourceDir, t.dir, 'tsconfig.json'),
    exclude: ['**/*.test.ts', '**/*.spec.ts', '**/__test__/**', '**/__mocks__/**', '**/test/**', '**/tests/**', '**/e2e/**'],
    out: join(contentDir, 'ts-api', t.name),
    docsPath: contentDir,
    // Sources are checked out without node_modules, so unresolved imports must not fail the build.
    skipErrorChecking: true,
    excludePrivate: true,
    excludeExternals: true,
    readme: 'none',
    hideBreadcrumbs: true,
    logLevel: 'Warn',
  },
]);

const apiItems = [
  ...(project.doxygen ? [{label: 'C++ API', href: cppApiHref, target: '_self'}] : []),
  ...(project.typedoc ?? []).map((t) => ({label: `TypeScript: ${t.name}`, to: `/ts-api/${t.name}`})),
];

const navbarItems: NavbarItem[] = [
  {type: 'docSidebar', sidebarId: 'docs', label: 'Docs', position: 'left'},
  ...(apiItems.length === 1
    ? [{...apiItems[0], position: 'left' as const}]
    : apiItems.length > 1
      ? [{type: 'dropdown' as const, label: 'API', position: 'left' as const, items: apiItems}]
      : []),
  ...(!isPublic && project.links?.length
    ? [{type: 'dropdown' as const, label: 'Projects', position: 'right' as const, items: project.links.map((l) => ({label: l.label, href: l.url}))}]
    : []),
  {href: github, label: 'GitHub', position: 'right'},
];

const builtFrom = [buildInfo.version, buildInfo.commit].filter(Boolean).join(' @ ');

const config: Config = {
  title: project.title,
  tagline: project.tagline,
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: siteUrl,
  baseUrl,
  trailingSlash: false,
  noIndex,

  onBrokenLinks: 'throw',
  markdown: {
    // .md is plain CommonMark so included READMEs aren't parsed as JSX; .mdx stays MDX.
    format: 'detect',
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  customFields: {
    project,
    cppApiHref: project.doxygen ? cppApiHref : undefined,
  },

  staticDirectories: ['static', 'generated/static'],

  presets: [
    [
      'classic',
      {
        docs: {
          path: contentDir,
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          // Included files set custom_edit_url; generated TypeScript API pages have no source to edit.
          editUrl: ({docPath}: {docPath: string}) =>
            project.docsDir && !docPath.startsWith('ts-api/')
              ? `${github}/edit/main/${project.docsDir}/${docPath}`
              : undefined,
          beforeDefaultRemarkPlugins: [cppApiLinks],
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    ...typedocPlugins,
    () => ({
      name: 'robots-txt',
      async postBuild({outDir}) {
        if (noIndex) await writeFile(join(outDir, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
      },
    }),
  ],

  themes: [
    '@docusaurus/theme-mermaid',
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        language: ['en'],
        indexBlog: false,
        indexPages: false,
        docsDir: contentDir,
        docsRouteBasePath: '/',
        highlightSearchTermsOnTargetPage: true,
        // Otherwise the noindex meta tag also keeps every page out of the local search index.
        forceIgnoreNoIndex: true,
      },
    ],
  ],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: project.title,
      logo: {
        alt: 'Daisytuner',
        src: 'img/logo.svg',
      },
      items: navbarItems,
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [{label: 'Introduction', to: `/${project.startDoc}`}, ...apiItems],
        },
        ...(isPublic
          ? [
              {
                title: 'Daisytuner',
                items: [
                  {label: 'Website', href: 'https://daisytuner.com'},
                  {label: 'Daisytuner Docs', href: 'https://docs.daisytuner.com'},
                ],
              },
              {
                title: 'Community',
                items: [
                  {label: 'GitHub', href: github},
                  {label: 'Discord', href: 'https://discord.gg/jpQ2h3f8jN'},
                  {label: 'LinkedIn', href: 'https://www.linkedin.com/company/daisytuner/'},
                ],
              },
            ]
          : [
              ...(project.links?.length
                ? [{title: 'Projects', items: project.links.map((l) => ({label: l.label, href: l.url}))}]
                : []),
              {title: 'Source', items: [{label: project.repo, href: github}]},
            ]),
      ],
      copyright: [
        `Copyright © ${new Date().getFullYear()} Daisytuner.`,
        isPublic ? project.license : 'Internal — do not share outside Daisytuner.',
        builtFrom && `<br/>Built from ${project.repo} ${builtFrom}.`,
      ]
        .filter(Boolean)
        .join(' '),
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['cmake', 'bash', 'json'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
