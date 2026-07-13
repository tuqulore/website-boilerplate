# @tuqulore-inc/eleventy-plugin-preact

Eleventy plugin for Preact server-side rendering with JSX/MDX support.

This plugin registers `.jsx` and `.mdx` as Eleventy template formats and renders them to HTML with Preact.

## Documentation

The design rationale (why Preact, why MDX, layout chaining) lives at [Plugins / eleventy-plugin-preact](https://website.tuqulore.pages.dev/en/plugins/eleventy-plugin-preact/). The writing conventions (`export const data`, `layout`, the `eleventy` singleton) live at [Preset Conventions](https://website.tuqulore.pages.dev/en/preset/).

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

1. Adds `.jsx` and `.mdx` as Eleventy template formats.
2. Renders Preact components to HTML with `preact-render-to-string`.
3. Registers Node.js loaders for JSX and MDX at module load time.

Client-side bundling and Partial Hydration are handled by [@tuqulore-inc/eleventy-plugin-preact-island](../eleventy-plugin-preact-island). Register the two side by side, or use [@tuqulore-inc/eleventy-preset](../eleventy-preset), which composes both.

## API

### `import preact from "@tuqulore-inc/eleventy-plugin-preact"`

The Eleventy plugin factory. Register with `eleventyConfig.addPlugin(preact)`.

### `import { eleventy } from "@tuqulore-inc/eleventy-plugin-preact/eleventy"`

The SSR-side singleton. Exposes `content`, `title`, `description`, `site`, `nav`, `page`, and any other data provided by Eleventy. Available only during SSR; not accessible from client-hydrated components. See [Preset Conventions / Data Access](https://website.tuqulore.pages.dev/en/preset/data-access/) for details.

## Requirements

- Node.js 20 or higher
- Eleventy 3.0 or higher
- Preact 10 or higher

## License

MIT
