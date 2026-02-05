# @tuqulore/eleventy-plugin-preact

Eleventy plugin for Preact server-side rendering with JSX/MDX support.

This plugin enables you to use JSX and MDX files as Eleventy templates, rendering Preact components to HTML on the server.

## Installation

```bash
npm install -D @11ty/eleventy @tuqulore/eleventy-plugin-preact
```

## Usage

```javascript
// eleventy.config.mjs
import preact from "@tuqulore/eleventy-plugin-preact";

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(preact, {
    hydrateGlob: "./src/**/*.hydrate.jsx", // optional
  });
}
```

## What it does

1. **Adds JSX/MDX template formats** - Use `.jsx` and `.mdx` files as Eleventy templates
2. **Server-side rendering** - Renders Preact components to HTML using `preact-render-to-string`
3. **Hydration bundles** - Optionally bundles `*.hydrate.jsx` files with esbuild for client-side hydration

## Options

### `hydrateGlob`

- Type: `string`
- Default: `undefined`

Glob pattern for hydration entry points. Files matching this pattern will be:
- Ignored by Eleventy (not processed as templates)
- Bundled with esbuild for client-side hydration

Example: `"./src/**/*.hydrate.jsx"`

## With Partial Hydration

For client-side partial hydration, use this plugin together with `@tuqulore/eleventy-plugin-preact-island`:

```javascript
import preact from "@tuqulore/eleventy-plugin-preact";
import preactIsland from "@tuqulore/eleventy-plugin-preact-island";

export default function (eleventyConfig) {
  // Server-side rendering
  eleventyConfig.addPlugin(preact, {
    hydrateGlob: "./src/**/*.hydrate.jsx",
  });

  // Client-side hydration
  eleventyConfig.addPlugin(preactIsland);
}
```

## Requirements

- Node.js 20 or higher
- Eleventy 3.0 or higher
- Preact 10 or later

## License

MIT
