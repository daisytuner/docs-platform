export type Include = {
  /** Repo-relative source file. */
  src: string;
  /** Path inside the project's docs, e.g. 'getting-started/build.md'. */
  dest: string;
  title: string;
  description?: string;
  sidebarPosition?: number;
};

export type TypedocPackage = {
  /** URL segment under ts-api/. */
  name: string;
  /** Package folder with src/ and tsconfig.json. */
  dir: string;
};

/** Shape of docs.config.json at the root of a source repo; validated by scripts/project.mjs. */
export type Project = {
  id: string;
  title: string;
  tagline: string;
  /** GitHub owner/name; the main branch is published. */
  repo: string;
  visibility: 'public' | 'internal';
  docsDir?: string;
  versionFile?: string;
  include?: Include[];
  doxygen?: {inputs: string[]};
  typedoc?: TypedocPackage[];
  /** Cards on the landing page; `doc` is a doc id of this project. */
  landing?: {title: string; description: string; doc: string}[];
  /** Doc id the "Read the docs" buttons point to. */
  startDoc: string;
  /** Footer line of a public site. */
  license?: string;
  /** Address of the deployed site; used for the sitemap and canonical URLs. */
  url?: string;
  /** Navbar "Projects" menu; shown on internal sites only. */
  links?: {label: string; url: string}[];
};
