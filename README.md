# Website Boilerplate

A monorepo of boilerplate code and tooling for building Eleventy projects.

## Documentation

Full documentation lives at [website.tuqulore.workers.dev](https://website.tuqulore.workers.dev/).

## Packages

| Package                                                                                 | Description                                                              |
| :-------------------------------------------------------------------------------------- | :----------------------------------------------------------------------- |
| [@tuqulore-inc/create-eleventy](./packages/create-eleventy)                             | CLI for creating a new project with `pnpm create @tuqulore-inc/eleventy` |
| [@tuqulore-inc/eleventy-preset](./packages/eleventy-preset)                             | Eleventy configuration preset                                            |
| [@tuqulore-inc/eleventy-plugin-preact](./packages/eleventy-plugin-preact)               | Plugin for JSX/MDX templates via Preact SSR                              |
| [@tuqulore-inc/eleventy-plugin-preact-island](./packages/eleventy-plugin-preact-island) | Plugin for Partial Hydration                                             |
| [@tuqulore-inc/eleventy-plugin-postcss](./packages/eleventy-plugin-postcss)             | Plugin for PostCSS                                                       |
| [@tuqulore-inc/eslint-config](./packages/eslint-config)                                 | Shared ESLint config                                                     |

## Quick start

Create a new Eleventy project:

```shell
pnpm create @tuqulore-inc/eleventy my-project
cd my-project
pnpm install
pnpm dev
```

## Development

For the development workflow, code formatting, static checks, and the manual testing procedure, see [CONTRIBUTING.md](./CONTRIBUTING.md).

### Requirements

- [Active LTS](https://github.com/nodejs/release#release-schedule)

### Setup

```shell
pnpm install
```

### npm scripts

| Task                  | Description                                                             |
| :-------------------- | :---------------------------------------------------------------------- |
| format                | Format code.                                                            |
| lint                  | Run static checks.                                                      |
| packages:bump-version | Bump versions with @lerna-lite/version. Used at release time.           |
| packages:publish      | Publish packages to npm with @lerna-lite/publish. Used at release time. |

## GitHub workflows

### CI

Static checks and code formatting run on PR branches.

### Release / Publish

Package releases and npm publishing. See [RELEASING.md](./RELEASING.md) for details.
