# Daisytuner docs platform

Shared tooling and theme for the developer documentation of Daisytuner projects. Each project
keeps its docs, a `docs.config.json` and its deployment in its own repository; this repo only
builds. It holds no project list and no credentials.

## How a project publishes docs

1. **`docs.config.json`** at the repo root describes what to publish (validated by
   [scripts/project.mjs](scripts/project.mjs); the shape is [src/types.ts](src/types.ts)):

   | Field | Meaning |
   | ----- | ------- |
   | `id`, `title`, `tagline`, `repo` | Identity; `repo` is `owner/name` for edit links |
   | `visibility` | `public`: served under `/<id>/` (e.g. docs.daisytuner.com/docc via Firebase Hosting). `internal`: served at `/`, never indexed. |
   | `url` | Address of the deployed site |
   | `startDoc` | Doc id the "Read the docs" button opens |
   | `docsDir` | Markdown folder. The sidebar follows the folder layout; order pages with `sidebar_position` front matter and folders with `_category_.json` (`label`, `position`). `.md` is CommonMark, `.mdx` is MDX. |
   | `include` | Single files elsewhere in the repo (e.g. a README) published as pages; relative links are rewritten to GitHub |
   | `doxygen.inputs` | C++ header folders, published at `cpp-api/`. Link to it from Markdown with `[C++ API](cpp-api:index.html)`. |
   | `typedoc` | TypeScript packages (`name`, `dir` with `src/` and `tsconfig.json`), published at `ts-api/<name>/`. Built without `node_modules`, so types from dependencies show up unresolved. |
   | `landing` | Cards on the start page |
   | `links` | Navbar "Projects" menu (internal sites only) |
   | `license` | Footer line of a public site |

2. **`.github/workflows/docs.yml`** calls the reusable
   [build-project.yml](.github/workflows/build-project.yml) on PRs (build only) and on `main`,
   nightly and manual runs (with `export-image: true`), then deploys the exported image with the
   repo's own Google Cloud credentials. The shared workflow never receives credentials.

To add a project, add those two files to its repo (copy them from an existing project). Nothing
in this repo changes.

## Writing docs

All content lives in the project's repo; you never need to change this repo to add pages.

### Add a page or section

Create Markdown files under the project's `docsDir` (usually `docs/`). Every folder becomes a
sidebar section, every file a page:

```
docs/
  tutorials/
    _category_.json        {"label": "Tutorials", "position": 5}
    offload-to-gpu.md
    offload-to-gpu/        images used by that page
      timeline.png
```

Start each page with front matter:

```markdown
---
title: Offload a Loop to the GPU
sidebar_position: 1
description: Shown in search results and link previews
---
```

- Pages and sections with a `position` come first, sorted by number; others follow by name.
  `_category_.json` also accepts `"collapsed": false` to show a section expanded.
- Without `title`, the first `# Heading` is used.
- `.md` files are plain CommonMark. Use `.mdx` only when you need React components (e.g. tabs).

### Markdown features

| Need | Write |
| ---- | ----- |
| Link to another page | Relative path to its file: `[Targets](../using-docc/targets.md)`. Checked at build time. |
| Link to the C++ API | `[StructuredSDFG](cpp-api:classsdfg_1_1StructuredSDFG.html)` (works on public and internal sites) |
| Link to a TypeScript API | Relative path into `ts-api/<name>/`, or use the navbar's API menu |
| Link to other repo files | Full GitHub URL; only `docsDir` and `include` files are part of the site |
| Image | File next to the page, relative path: `![Timeline](./offload-to-gpu/timeline.png)` |
| Callout | `:::note`, `:::tip`, `:::info`, `:::warning`, `:::danger`; custom title: `:::tip[Title]` |
| Diagram | A ` ```mermaid ` code block |
| Code | Fenced block with a language; `cmake`, `bash` and `json` are enabled in addition to the defaults |

Public projects publish everything under `docsDir` to the internet; keep internal details out.

### Publish an existing file

To publish a file that lives elsewhere in the repo (e.g. a README or a tutorial folder), add it
to `include` in `docs.config.json` instead of copying it:

```json
{"src": "tutorial/my_target/README.md", "dest": "tutorials/my-target.md", "title": "Writing a Target", "sidebarPosition": 2}
```

Its first `# Heading` is replaced by `title`, its relative links point to GitHub, and "Edit this
page" opens the original. Add `src` to the paths of the repo's `docs.yml` so changes to it trigger
a build.

### API reference

API pages are generated from code comments; no Markdown is needed:

- **C++**: Doxygen comments (`/** ... */`, `///`) in the folders listed in `doxygen.inputs`.
- **TypeScript**: TSDoc comments (`/** ... @param ... @returns */`) in the packages listed in
  `typedoc`. Doxygen tags such as `@brief` are not recognized there.

New header folders or packages go into `docs.config.json` and the paths of `docs.yml`.

### Preview, review and publish

1. Preview with `DOCS_SOURCE=<project checkout> npm start` (see [Develop locally](#develop-locally)).
   Run `npm run build` once before opening a PR; it fails on broken links like CI does.
2. Open a PR in the project's repo. Its **Docs** check builds and smoke-tests the site; typical
   failures are broken links, an invalid `docs.config.json` (the error names the field) and
   missing Doxygen inputs.
3. After the merge to `main`, the site redeploys automatically.

To feature a page on the start page, add it to `landing` in `docs.config.json`:
`{"title": "Tutorials", "description": "Step-by-step guides", "doc": "tutorials/offload-to-gpu"}`.

## Develop locally

Requires Node 24, `doxygen` and `graphviz`.

```bash
npm ci
DOCS_SOURCE=../path/to/project npm start   # a checkout containing docs.config.json
```

`npm start` doesn't watch the project checkout; restart it after editing its docs.
`DOCS_NOINDEX=false` lets search engines index a public site.

### Docker

The image builds with a pinned Doxygen and serves the site with nginx on port 8080. The build
context is this repo with the project checkout in `source/`:

```bash
cp -r ../path/to/project source    # .dockerignore skips node_modules/ and build/
docker build -t docs .
docker run --rm -p 8088:8080 docs
DOCS_SOURCE=source node scripts/smoke-test.mjs http://localhost:8088
```

## Changing the platform

Every project uses `build-project.yml@main` and rebuilds nightly, so a merge here reaches all
docs sites within a day. `main` is protected: changes need a reviewed pull request and a passing
[CI](.github/workflows/ci.yml), which builds the public docc docs with the change.
