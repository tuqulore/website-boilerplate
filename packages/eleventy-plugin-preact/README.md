# @tuqulore-inc/eleventy-plugin-preact

Eleventy plugin for Preact server-side rendering with JSX/MDX support.

This plugin enables you to use JSX and MDX files as Eleventy templates, rendering Preact components to HTML on the server.

## Installation

```bash
npm install -D @11ty/eleventy @tuqulore-inc/eleventy-plugin-preact preact
```

## Usage

```javascript
// eleventy.config.mjs
import preact from "@tuqulore-inc/eleventy-plugin-preact";

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(preact);
}
```

## What it does

1. **Adds JSX/MDX template formats** - Use `.jsx` and `.mdx` files as Eleventy templates
2. **Server-side rendering** - Renders Preact components to HTML using `preact-render-to-string`
3. **Registers Node.js loaders** for JSX/MDX at module load time

Client-side bundling and partial hydration are the responsibility of a companion package — see [With Partial Hydration](#with-partial-hydration) below.

## Eleventy Data Access

This plugin provides a singleton object for accessing Eleventy data from any template or component during SSR, without prop drilling.

### Usage

```jsx
import { eleventy } from "@tuqulore-inc/eleventy-plugin-preact/eleventy";

// In layout
<title>{eleventy.title} | {eleventy.site.name}</title>

// In partials (no need to pass props)
<footer>&copy; {eleventy.site.author}</footer>
```

### Available Data

| Property                                       | Description                               |
| ---------------------------------------------- | ----------------------------------------- |
| `eleventy.content`                             | Rendered HTML from child template         |
| `eleventy.title`, `eleventy.description`, etc. | Values from `data` export or front matter |
| `eleventy.site`, `eleventy.nav`, etc.          | Global data from `_data/` directory       |
| `eleventy.page`                                | Eleventy page data (url, date, etc.)      |

### Important Notes

- The `eleventy` singleton is only available during SSR. Accessing it outside of SSR context will throw an error.
- For hydrated components, use `<Island>` from `@tuqulore-inc/eleventy-plugin-preact-island/island`, which forwards the passed props to both the SSR render and the client hydration; the `eleventy` singleton itself is not available on the client.

## With Partial Hydration

For partial hydration, use this plugin together with `@tuqulore-inc/eleventy-plugin-preact-island`. The Island plugin owns client-side bundling (`*.client.jsx`), the Eleventy ignore rule, and the SSR-to-browser URL resolver — this plugin only does SSR.

```javascript
import preact from "@tuqulore-inc/eleventy-plugin-preact";
import preactIsland from "@tuqulore-inc/eleventy-plugin-preact-island";

export default function (eleventyConfig) {
  // Server-side rendering (no options)
  eleventyConfig.addPlugin(preact);

  // Partial hydration + client bundle + URL resolver (single source of truth).
  // The URL prefix follows Eleventy's own `pathPrefix`, so it is not set here.
  eleventyConfig.addPlugin(preactIsland, {
    entries: "./src/**/*.client.jsx",
    srcDir: "src",
    outDir: "dist",
  });
}
```

## Requirements

- Node.js 20 or higher
- Eleventy 3.0 or higher
- Preact 10 or higher

## License

MIT
