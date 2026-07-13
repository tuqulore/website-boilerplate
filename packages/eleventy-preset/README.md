# @tuqulore-inc/eleventy-preset

Eleventy preset for building static sites with Preact JSX/MDX templates, Partial Hydration, and PostCSS.

## Documentation

Design rationale, day-to-day writing conventions, and applied recipes live at [website.tuqulore.pages.dev](https://website.tuqulore.pages.dev/). See especially:

- [Architecture](https://website.tuqulore.pages.dev/en/architecture/) — the overall design and key trade-offs.
- [Preset Conventions](https://website.tuqulore.pages.dev/en/preset/) — writing conventions (directory layout, templates, data access).
- [Plugins](https://website.tuqulore.pages.dev/en/plugins/) — internal design of the plugins this preset bundles.

## Installation

```bash
npm install -D @11ty/eleventy @tuqulore-inc/eleventy-preset preact postcss
```

## Usage

```javascript
// eleventy.config.js
import preset from "@tuqulore-inc/eleventy-preset";

export default preset();
```

### With custom configuration

`preset()` takes an `extend` callback that receives Eleventy's `UserConfig`. Add filters or plugins there.

```javascript
// eleventy.config.js
import preset from "@tuqulore-inc/eleventy-preset";

export default preset((eleventyConfig) => {
  eleventyConfig.addFilter("myFilter", (value) => value);
});
```

## What is included

### Plugins

- **[@tuqulore-inc/eleventy-plugin-preact](../eleventy-plugin-preact)** — JSX/MDX server-side rendering.
- **[@tuqulore-inc/eleventy-plugin-preact-island](../eleventy-plugin-preact-island)** — Partial Hydration with is-land.
- **[@tuqulore-inc/eleventy-plugin-postcss](../eleventy-plugin-postcss)** — CSS processing with PostCSS.

### Default behavior

| Feature              | Description                                          |
| -------------------- | ---------------------------------------------------- |
| Input directory      | `src`                                                |
| Output directory     | `dist`                                               |
| Client entries       | `src/**/*.client.{js,jsx,ts,tsx}`                    |
| PostCSS content glob | `src/**/*.{md,mdx,jsx}`                              |
| Server watches       | `dist/**/*.css`                                      |
| Markdown             | `breaks: true`, `linkify: true`                      |
| Static assets        | `src/public/**` copied to root                       |
| Image optimization   | Images under `src/**` optimized and copied to `dist` |

The input/output directories (`src` / `dist`) are fixed and cannot be overridden with `setInputDirectory` / `setOutputDirectory`. Image optimization and other features depend on this directory structure.

### Template formats

| Extension | Description               |
| --------- | ------------------------- |
| `.jsx`    | Preact JSX components     |
| `.mdx`    | Markdown with JSX support |

## API

### `preset(extend?)`

Returns an Eleventy configuration function that registers the three plugins above and the default behavior.

- `extend` — Optional `(eleventyConfig: UserConfig) => void` callback. Called at the end of the preset's own registration so you can add filters, plugins, or shortcodes on top.

### `import { eleventy } from "@tuqulore-inc/eleventy-preset/eleventy"`

Re-exports the SSR-side singleton from [@tuqulore-inc/eleventy-plugin-preact](../eleventy-plugin-preact) for reading page data and global data without prop drilling. See [Preset Conventions / Data Access](https://website.tuqulore.pages.dev/en/preset/data-access/) for the shape and usage.

### `import { Island, clientComponent } from "@tuqulore-inc/eleventy-preset/island"`

Re-exports from [@tuqulore-inc/eleventy-plugin-preact-island](../eleventy-plugin-preact-island) for authoring Partial Hydration. See [Plugins / eleventy-plugin-preact-island](https://website.tuqulore.pages.dev/en/plugins/eleventy-plugin-preact-island/) for the design and that package's README for the full API.

## Requirements

- Node.js 20 or higher
- Eleventy 3.0 or higher
- Preact 10 or higher
- PostCSS 8 or higher

## License

MIT
