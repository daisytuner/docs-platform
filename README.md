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
