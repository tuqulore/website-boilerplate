# @tuqulore/eleventy-plugin-preact-island

Eleventy plugin for Preact partial hydration with is-land.

This plugin automatically injects the necessary scripts for Preact hydration into all HTML pages.

## Installation

```bash
npm install -D @11ty/eleventy @11ty/is-land @tuqulore/eleventy-plugin-preact-island
```

## Usage

```javascript
// eleventy.config.mjs
import preactIsland from "@tuqulore/eleventy-plugin-preact-island";

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(preactIsland, {
    preactVersion: "10.26.4", // optional
  });
}
```

## What it does

1. **Copies `is-land.js`** from `@11ty/is-land` to the output directory
2. **Injects scripts** before `</head>`:
   - Import map for is-land and Preact (from esm.sh CDN)
   - Development-only WebSocket hook for rehydration after hot reload
   - is-land setup script with `Island.addInitType("preact", mount)`

## Options

### `preactVersion`

- Type: `string`
- Default: `""` (latest)

Specify the Preact version to use from esm.sh CDN.

## Requirements

- Eleventy 3.0 or higher
- @11ty/is-land

## License

MIT
