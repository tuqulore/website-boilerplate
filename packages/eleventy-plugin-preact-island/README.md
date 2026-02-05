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

## What it injects

The plugin injects the following scripts before `</head>`:

1. **Import map** for is-land and Preact (from esm.sh CDN)
2. **Development-only WebSocket hook** for rehydration after hot reload
3. **is-land setup script** with `Island.addInitType("preact", mount)`

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
