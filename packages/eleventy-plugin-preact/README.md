# @tuqulore-inc/eleventy-plugin-preact

Eleventy plugin for Preact server-side rendering with JSX/TSX/MDX support.

This plugin registers `.jsx`, `.tsx`, and `.mdx` as Eleventy template formats and renders them to HTML with Preact. JSX/TSX/TS files are transpiled by [`oxc-transform`](https://oxc.rs/) (Rust) and MDX is compiled by [Sätteri](https://github.com/bruits/satteri) (Rust) — no Babel or `@mdx-js/*` in the SSR pipeline.

## Documentation

The design rationale (why Preact, why MDX, layout chaining) lives at [Plugins / eleventy-plugin-preact](https://website.tuqulore.workers.dev/en/plugins/eleventy-plugin-preact/). The writing conventions (frontmatter, `layout`, the `eleventy` singleton) live at [Preset Conventions](https://website.tuqulore.workers.dev/en/preset/).

## Installation

```bash
npm install -D @11ty/eleventy @tuqulore-inc/eleventy-plugin-preact preact
```

## Usage

```javascript
// eleventy.config.js
import preact from "@tuqulore-inc/eleventy-plugin-preact";

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(preact);
}
```

## What it does

1. Adds `.jsx`, `.tsx`, and `.mdx` as Eleventy template formats.
2. Renders Preact components to HTML with `preact-render-to-string`.
3. Registers Node.js loaders for JSX/TSX/TS and MDX at module load time.

Client-side bundling and Partial Hydration are handled by [@tuqulore-inc/eleventy-plugin-preact-island](../eleventy-plugin-preact-island). Register the two side by side, or use [@tuqulore-inc/eleventy-preset](../eleventy-preset), which composes both.

## TypeScript

`.tsx` and `.ts` files are accepted transparently. The SSR loader strips type annotations and lowers JSX to Preact's automatic runtime with fixed options — `runtime: "automatic"`, `importSource: "preact"`. No `tsconfig.json` is required and none is read.

- `.tsx` — first-class template format; strips types and compiles JSX.
- `.ts` — accepted as an import target (utility modules, MDX imports); strips types only.
- Type checking is not the plugin's responsibility. Run `tsc --noEmit` (or your editor's TypeScript service) separately.
- Parser-recovery diagnostics below `"Error"` severity do not abort the transform, so a type mistake never breaks the build — matching the behaviour of `esbuild --loader=tsx` and `@babel/preset-typescript`.

```tsx
// src/hello.tsx
type Props = { name: string };

export const data = { title: "Hello" };

export default function Hello({ name }: Props) {
  return <h1>Hello, {name}!</h1>;
}
```

## MDX

MDX files are compiled by Sätteri with the following features enabled by default:

- **GFM** — tables, task lists, strikethrough, footnotes.
- **Heading anchors** — every `<h1>`–`<h6>` receives an `id` slugged by [`github-slugger`](https://github.com/Flet/github-slugger), with the same repeat-suffix behaviour (`hello`, `hello-1`, `hello-2`).
- **YAML frontmatter** — the block between `---` fences at the top of the file is parsed as YAML and forwarded to Eleventy's data cascade. This is the recommended way to declare page data in MDX.

```mdx
---
layout: post
title: Getting Started
---

# Getting Started

- [x] Install the plugin
- [ ] Ship the site
```

A file-level `export const data = { ... }` is also accepted, and is required when the page data references JS values that YAML can't express. Combining it with frontmatter in the same file is rejected as a duplicate export — pick one.

```mdx
export const data = { title: "Getting Started", layout: "post" };

# Getting Started
```

## API

### `import preact from "@tuqulore-inc/eleventy-plugin-preact"`

The Eleventy plugin factory. Register with `eleventyConfig.addPlugin(preact)`.

### `import { eleventy } from "@tuqulore-inc/eleventy-plugin-preact/eleventy"`

The SSR-side singleton. Exposes `content`, `title`, `description`, `site`, `nav`, `page`, and any other data provided by Eleventy. Available only during SSR; not accessible from client-hydrated components. See [Preset Conventions / Data Access](https://website.tuqulore.workers.dev/en/preset/data-access/) for details.

## Requirements

- Node.js 20.19+ or 22.12+ (matches `oxc-transform`'s engines requirement)
- Eleventy 3.0 or higher
- Preact 10 or higher

## License

MIT
