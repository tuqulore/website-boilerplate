# @tuqulore/eleventy-plugin-preact-island

Eleventy plugin for Preact partial hydration with is-land.

This plugin automatically injects the necessary scripts for Preact hydration into all HTML pages.

## Installation

```bash
npm install -D @11ty/eleventy @tuqulore/eleventy-plugin-preact-island
```

## Usage

```javascript
// eleventy.config.mjs
import preactIsland from "@tuqulore/eleventy-plugin-preact-island";

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(preactIsland);
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

```javascript
eleventyConfig.addPlugin(preactIsland, {
  preactVersion: "10.26.4",
});
```

## Partial Hydration

To hydrate a component, use the `<is-land>` web component with `type="preact"`.

```mdx
import Component from "./component.hydrate.jsx";

<is-land
  land-on:visible
  type="preact"
  import="./component.hydrate.js"
  props='{ "someProp": "value" }'
>
  <Component someProp="value" />
</is-land>
```

- The inner `<Component />` is rendered at build time (SSR)
- The component is hydrated in the browser when the `<is-land>` becomes visible

> **Note:** The `on:*` attribute prefix is changed to `land-on:*` to avoid conflicts with JSX syntax.

### `<is-land>` Attributes

| Attribute   | Description                                                                                                                      |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `type`      | Hydration runtime. Set to `"preact"`.                                                                                            |
| `import`    | Path to the hydration script (e.g., `./component.hydrate.js`).                                                                   |
| `props`     | JSON-stringified props to pass to the component.                                                                                 |
| `land-on:*` | [Initialization conditions](https://github.com/11ty/is-land?tab=readme-ov-file#usage) (e.g., `land-on:visible`, `land-on:idle`). |

## Requirements

- Eleventy 3.0 or higher

## License

MIT
